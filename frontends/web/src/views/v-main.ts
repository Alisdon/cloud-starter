import { position } from '@dom-native/draggable';
import { getRouteWksId, pathAt } from 'common/route.js';
import { logoff, UserContext } from 'common/user-ctx.js';
import { BaseViewElement } from 'common/v-base.js';
import { append, css, customElement, elem, first, frag, on, onEvent, onHub, push } from 'dom-native';
import { isNotEmpty } from 'utils-min';
import { DgChangePwd } from './dg-change-pwd';

const _compCss = css`

`

const defaultPath = "";

const tagNameByPath: { [name: string]: string } = {
	"": 'v-home',
	"_spec": 'v-spec-main',
};


@customElement('v-main')
export class MainView extends BaseViewElement {
	private _userContext?: UserContext;


	//// Key elements
	private get mainEl() { return first(this, 'main')! };
	private get headerAsideEl() { return first(this, 'header aside')! }

	//#region    ---------- Data Setters ---------- 
	set userContext(v: UserContext) {
		this._userContext = v;
		push(this.headerAsideEl, { name: this._userContext.name });
	}
	//#endn pregion ---------- /Data Setters ---------- 


	//#region    ---------- Element & Hub Events ---------- 
	@onEvent('pointerup', '.toogle-user-menu')
	showMenu(evt: PointerEvent) {
		const menuId = 'user-menu-123';
		if (first(`#user-menu-123`) == null) {

			const [menu] = append(document.body, frag(`
			<c-menu id='user-menu-123'>
				<li class="do-logoff">Logoff</li>
				<li class="show-profile">Profile</li>
				<li class="change-pwd">Change password</li>
			</c-menu>
			`));

			position(menu, this.headerAsideEl, { at: 'bottom', align: 'right' });

			on(menu, 'pointerup', 'li.do-logoff', async (evt) => {
				await logoff();
				window.location.href = '/';
			});

			on(menu, 'pointerup', 'li.show-profile', async (evt) => {
				this.doOpenProfilePanel()
			});

			on(menu, 'pointerup', 'li.change-pwd', async () => {
				append(document.body, elem('dg-change-pwd')) as DgChangePwd;
			});
		}
	}


	@onHub('routeHub', 'CHANGE')
	routChange() {
		this.refresh()
	}
	//#endregion ---------- /Element & Hub Events ----------

	init() {
		super.init();
		this.innerHTML = _render();
		this.refresh();
	}

	refresh() {
		if (this.hasPathChanged(0)) {
			// first, try to get the wksId from the route, and if valid, then, show v-wks-main
			const wksId = getRouteWksId();
			const newPath = pathAt(0);

			if (newPath != null && wksId != null) {
				this.mainEl.innerHTML = `<v-wks-main wks-id="${wksId}"></v-wks-main>`;
			}
			else {
				const name = isNotEmpty(newPath) ? newPath : '';

				const tagName = tagNameByPath[name];
				this.mainEl.innerHTML = `<${tagName}></${tagName}>`;
			}
		}

	}

	private doOpenProfilePanel() { 
		const parentNode = first('v-main main');
		
		if (first(parentNode, 'c-slide-panel') == null) {
			parentNode?.classList.add('is-show-profile');
			
			const [panel] = append(parentNode as HTMLElement, frag(`
				<c-slide-panel>
					<div slot="title">User Profile</div>
					<div>
						<div class="line"></div>
						<h3 class="username">${this._userContext?.username}</h3>
						<h3 class="name">${this._userContext?.name}</h3>
						<h3 class="other">
							<span>Role: ${this._userContext?.role || 'unknown'}</span>  
							<span>Member since: ${this._userContext?.member || 'unknown'}</span>
						</h3>
						<div class="line"></div>
					</div>
				</c-slide-panel>
			`));

			on(panel, 'CLOSE', async (evt) => {
				parentNode?.classList.remove('is-show-profile');
			});
		}
	}
}

//// HTML
function _render() {
	return `
	<header>
		<d-ico name="ico-menu">menu</d-ico>
		<a href='/'><h3>CLOUD BIGAPP</h3></a>
		<aside class="toogle-user-menu">
			<c-ico>user</c-ico>
			<div class="dx dx-name">Some name</div>
		</aside>
	</header>

	<main>
	</main>
	<div class="__version__">${window.__version__}</div>
	`
}