import {adoptStyleSheets, BaseHTMLElement, css, customElement, first, html, on, onDoc, onEvent, trigger} from 'dom-native';

//// CSS
const _compCss = css`
	:host {
		position: absolute;
		z-index: 1;
		top: 0;
		left: 0;
		bottom: 0;
		right: 0;
		background: rgba(0, 0, 0, 0.3);
	}

	.slide-panel {
		position: absolute;
		width: 25rem;
		top: 0;
		right: 0;
		height: 100%;
		background: #fff;
		box-shadow: var(--elev-6-shadow);

		display: grid;
		grid-template-rows: 3rem 1fr 0.5rem 2rem;
		grid-template-columns: 1rem 1fr 2rem;
		grid-gap: 0 1rem;
		transform: translateX(100%);
		transition: 0.3s;
	}

	.slide-panel.open {
		transform: translateX(0);
	}

	header {
		display: contents;
	}

	.title {
		align-self: center;
		grid-area: 1 / 2;
	}

	/* style slot placehold as well */
	.title > *,
	.title > ::slotted(*) {
		font-size: 1.2rem;
	}

	header c-ico {
		grid-area: 1 / 3;
		width: 1.5rem;
		height: 1.5rem;
		justify-self: center;
		align-self: center;
	}

	section {
		grid-area: 2 / 2;
	}
`;

@customElement('c-slide-panel')
export class SliderPanelElement extends BaseHTMLElement {
	/* to avoid having the caller doing a prevent default on click */
	private _acceptDocEvent = false;

	constructor() {
		super();
		adoptStyleSheets(this.attachShadow({mode: 'open'}), _compCss).append(_renderShadow());
	}

	init() {
		const title = this.getAttribute('title');

		if (title) {
			this.innerHTML += `<div slot="title">${title}</div>`;
		}
	}

	postDisplay() {
		this._acceptDocEvent = true;
		first(this.shadowRoot, '.slide-panel')?.classList.add('open');
	}

	//#region    ---------- Events ----------
	@onEvent('pointerup', '.do-close')
	doClose() {
		this.close();
	}

	@onEvent('pointerup')
	onContextUp(e: PointerEvent) {
		e.stopPropagation()
		e.cancelBubble = true;
	}

	@onDoc('pointerup')
	onDocUp() {
		if (this._acceptDocEvent) {
			this.close();
		}
	}
	//#endregion ---------- /Events ----------

	close() {
		this._acceptDocEvent = false;
		first(this.shadowRoot, '.open')?.classList.remove('open');
		on(this.shadowRoot, 'transitionend', () => {
			this.remove();
			trigger(this, 'CLOSE');
		});
	}
}

//// ShadowRoot render
function _renderShadow() {
	const content = html`
		<div class="slide-panel">
			<header>
				<div class="title">
					<slot name="title"></slot>
				</div>
				<c-ico class="do-close" src="#ico-close"></c-ico>
			</header>
			<section>
				<slot></slot>
			</section>
		</div>
	`;

	return content;
}
