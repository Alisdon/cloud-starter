import { userDco } from 'dcos.js';
import { adoptStyleSheets, closest, css, customElement, first, OnEvent, onEvent, pull, trigger } from 'dom-native';
import { isNotEmpty } from 'utils-min';
import { DgDialog } from '../dialog/dg-dialog.js';


const _compCss = css`
	::slotted(.dialog-content) {
		display: grid;
		grid-auto-flow: row;
		grid-auto-rows: min-content; 
		grid-gap: 1rem;
	}
`;


@customElement('dg-change-pwd')
export class DgChangePwd extends DgDialog {
	constructor() {
		super();
		adoptStyleSheets(this, _compCss);
	}

	set #message(val: string) {
		const ERR_CLASS_NAME = 'is_error';
		const msgEl = first(this, '.dialog-content .message')!;
		const hasErrClass = msgEl?.classList.contains(ERR_CLASS_NAME)

		if (val) {
			hasErrClass || msgEl?.classList.add(ERR_CLASS_NAME);
			msgEl.textContent = val;
		} else {
			hasErrClass && msgEl?.classList.remove(ERR_CLASS_NAME);
			msgEl.textContent = '';
		}
	}

	@onEvent('pointerup', '.do-ok')
	async doOk() {
		const detail = pull(this);

		// to valid input text
		if (this.doValid(detail)) { 
			try {
				await userDco.changePwd({ oldPwd: detail.old, newPwd: detail.new });
				
				super.doOk();
				trigger(this, 'CHANGE_PWD');
			} catch (ex: any) {
				this.#message = ex.error || ex.message || 'change password failed'
			}
		}
	}

	@onEvent('pointerup', 'd-input d-ico.trail')
	onIconUp(e: PointerEvent & OnEvent) {
		const el = e.selectTarget;
		const parentEl = closest(el, 'd-input');
		const inputEl = first(parentEl, '.d-ipt')!;
		const isPwd = inputEl?.getAttribute('type') === 'password';
		
		// trigger focus
		parentEl?.focus();

		// modify input type and change icon
		inputEl.setAttribute('type', isPwd ? 'text' : 'password');
		first(el, 'use')?.setAttribute('xlink:href', isPwd ? '#d-ico-star' : '#d-ico-visible')
	}

	init() {
		// add the content to be slotted
		this.innerHTML = `
			<div slot="title">Change Password</div>

			<div class="dialog-content">
				<d-input label="old password" password name="old" ico-trail="d-ico-visible"></d-input>
				<d-input label="new password" password name="new" ico-trail="d-ico-visible"></d-input>
				<d-input label="repeat new password" password name="reNew" ico-trail="d-ico-visible"></d-input>
				<div class="message"></div>
			</div>
			
			<button slot="footer" class="do-cancel">CANCEL</button>
			<button slot="footer" class="do-ok medium">OK</button>
		`;
	}

	postDisplay() {
		first(this, '[name="old"]')?.focus();
	}

	private doValid(detail: { old: string, new: string, reNew: string }): boolean { 
		this.#message = '';

		if (!isNotEmpty(detail.old)) { 
			this.#message = 'old password is empty';
			return false;
		}

		if (!isNotEmpty(detail.new)) { 
			this.#message = 'new password is empty';
			return false;
		}

		if (detail.new !== detail.reNew) { 
			this.#message = 'new password and repeat new password are inconsistent';
			return false;
		}

		if (detail.old === detail.new) { 
			this.#message = 'new password and old password are same';
			return false;
		}

		return true
	}
}

