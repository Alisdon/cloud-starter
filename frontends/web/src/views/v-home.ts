import { position } from '@dom-native/draggable';
import { BaseViewElement } from 'common/v-base.js';
import { wksDco } from 'dcos';
import { all, append, closest, customElement, elem, first, on, OnEvent, onEvent, onHub, push, style } from 'dom-native';
import { Wks } from 'shared/entities.js';
import { asNum } from 'utils-min';
import { activateDrag, capture } from '@dom-native/draggable';

@customElement('v-home')
export class wksListView extends BaseViewElement {
	// card be drag and order is change
	#isCardRankChange = false

	//#region    ---------- Events---------- 
	@onEvent('click', '.wks-add')
	clickAddWks() {
		const dialogEl = append(document.body, elem('dg-wks-add'));
		on(dialogEl, 'WKS_ADD', (evt) => {
			wksDco.create(evt.detail);
		});
	}

	// Note: since .card is a <a> tag, prevent following on click on .show-menu (must bind to click)
	@onEvent('click', 'a .show-menu')
	onShowClick(evt: MouseEvent & OnEvent) {
		evt.preventDefault();
		evt.cancelBubble = true;
	}

	@onEvent('pointerup', '.show-menu')
	onCardShowMenuUp(evt: PointerEvent & OnEvent) {

		if (first('#wks-card-menu') == null) {

			const [menu] = append(document.body, `
			<c-menu id='wks-card-menu'>
			<li class="do-delete">Delete</li>
			<li class="do-edit">Edit</li>
			</c-menu>`);

			position(menu, evt.selectTarget, { at: 'bottom', align: 'right' });

			const cardEl = closest(evt.selectTarget, '[data-type="Wks"]');
			on(menu, 'pointerup', '.do-delete', async (evt) => {
				const id = asNum(cardEl?.getAttribute('data-id'));
				if (id == null) {
					throw new Error(`UI ERROR - cannot find data-type Case data-id on element ${cardEl}`);
				}
				await wksDco.remove(id);
			})

			on(menu, 'pointerup', '.do-edit', async (evt) => {
				const id = asNum(cardEl?.getAttribute('data-id'));
				if (id == null) {
					throw new Error(`UI ERROR - cannot find data-type Case data-id on element ${cardEl}`);
				}
				
				// get the workspace info
				const wksContext = await wksDco.get(id);
				const dialogEl = append(document.body, elem('dg-wks-edit'));
				
				// fill value
				push(first(dialogEl, '.dialog-content')!, {
					name: wksContext.name,
					description: wksContext.description
				})
				
				on(dialogEl, 'WKS_EDIT', (evt) => {
					wksDco.update(id, evt.detail);
				});
			})
		}
	}

	@onEvent('pointerdown', 'a.card')
	onCardDrap(pointerDownEvt: PointerEvent & OnEvent) {
		const panel = pointerDownEvt.selectTarget as HTMLElement;

		let currentOver: HTMLElement | undefined;
		let currentOverPanel: HTMLElement | undefined;
		let animationHappening = false;

		const isBefore = (cpanel: HTMLElement, ref: HTMLElement) => {
			const cpanels = all(first(this, 'section'), 'a.card');
			for (const cp of cpanels) {
				if (cp === cpanel) {
					return true;
				}
				if (cp === ref) {
					return false;
				}
			}
			return false;
		}

		activateDrag(panel, pointerDownEvt, {
			// NOTE 1 - the pointerCapture cannot be source (the default) since it will be re-attached causing a cancel
			//          @dom-native/draggable allows to set a custom pointerCapture
			// NOTE 2 - binding pointerCapture roolEl might have some significant performance impact on mobile devices (e.g.,, mobile safari).
			//          document.body shortest event path, and provides sensible performance gain on ipad.
			pointerCapture: document.body,

			// we will still drag the ghost (here could be 'none' as well)
			drag: 'ghost',

			// only used here to customize the ghost a little
			onDragStart: (evt) => {
				const { ghost } = evt.detail;

				style(ghost!, {
					opacity: '.5',
					background: 'red'
				});
			}, // /onDragStart

			onDrag: async (evt) => {

				// only proceed if no animation happening
				if (!animationHappening) {
					const { over } = evt.detail;

					// work further only if over has changed, that over is not self, and no pending animation
					if (over != panel && over != currentOver) {

						let overPanel: HTMLElement | undefined;
						// get the a.card from the over
						overPanel = closest(over, 'a.card') as HTMLElement ?? undefined;

						// only perform animation overPanel is different
						if (overPanel != null && overPanel != currentOverPanel) {
							animationHappening = true;

							//// not-so-magic FLIP
							// 1) capture the panel positions
							const inv = capture(all(this, 'a.card'));

							// 2) move the panel
							const pos = isBefore(panel, overPanel) ? 'after' : 'before';
							append(overPanel, panel, pos);

							// 3) inver the position (pretend nothing happen)
							const play = inv();

							// 4) play the animation (got to love closure state capture)
							await play();

							// Now we are done (play return a promise when the animation is done - approximation -)
							animationHappening = false;
							// reset the currents (in case user follow the moved item)
							currentOverPanel = undefined;
							currentOver = undefined;
							this.#isCardRankChange = true;
						} else {
							// update state for the next onDrag
							currentOverPanel = overPanel;
							currentOver = over;
						}
					}
				}
			}, // /onDrag

			onDragEnd: () => { 
				
				if (this.#isCardRankChange) {
					const cards = all(this, 'a.card');
					const cardRanks = cards.map(c => asNum(c?.getAttribute('data-rank'))).sort();
					
					cards.forEach(async (c, i) => {
						// to update this rank if it order change
						if (asNum(c?.getAttribute('data-rank')) !== cardRanks[i]) { 
							await wksDco.update(asNum(c?.getAttribute('data-id'))!, { rank: cardRanks[i] || 0 });
						}
					})
				}
				
				this.#isCardRankChange = false;
			}, // onDragEnd
		}); // /activateDrag
	};
	
	//#endregion ---------- /Events---------- 

	//#region    ---------- Hub Events ---------- 
	@onHub('dcoHub', 'Wks', 'create, update, remove')
	async onWksChange() {
		const wksList = await wksDco.list();
		this.refresh(wksList);
	}
	//#endregion ---------- /Hub Events ---------- 


	async init() {
		super.init();

		// BEST-PRATICE: init() should always attempt to draw the empty state without async when possible
		//               Here we do this with `this.refresh([])` which will 
		this.refresh([]); // this will execute in sync as it will not do any server request

		// Now that this element has rendered its empty state, call this.refresh() will will initiate
		// an async data fetching and therefore will execute later.
		this.refresh();
	}

	async refresh(wksList?: Wks[]) {
		// if no wksList, then, fetch the new list
		if (wksList == null) {
			wksList = await wksDco.list();
		}
		this.innerHTML = _render(wksList);
	}
}

//// HTMLs

function _render(wksList: Wks[] = []) {
	let html = `	<header><h1>Workspaces</h1></header>
	<section>
		<div class="card wks-add">
			<c-ico src="#ico-add"></c-ico>
			<h3>Add New Workspace</h3>
		</div>
	`;

	for (const p of wksList) {
		html += `	<a class="card wks" data-type="Wks" data-id="${p.id}" data-rank="${p.rank}" href="/${p.id}">
		<header>
			<h2>${p.name}</h2>
			<c-ico src="#ico-more" class="show-menu"></c-ico>
		</header>
		<section class="desc">${p.description || ''}</section>
	</a>	`
	};

	html += `</section>`;

	return html;

}