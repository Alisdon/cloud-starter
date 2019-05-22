import { BaseView, BaseViewClass, addHubEvents, RouteInfo } from 'views/base';
import { display, first, all } from 'mvdom';
import { SpecTypoView, SpecCardsView, SpecButtonsView, SpecDialogsView, SpecControlsView } from 'views/Spec/SpecViews';
import { pathAt } from 'ts/route';


const defaultPath = 'typo';

const pathToView: { [name: string]: BaseViewClass } = {
	'typo': SpecTypoView,
	'cards': SpecCardsView,
	'buttons': SpecButtonsView,
	'dialogs': SpecDialogsView,
	'controls': SpecControlsView
};

export class SpecMainView extends BaseView {

	protected get main() { return first(this.el, 'section.content')! }

	hubEvents = addHubEvents(this.hubEvents, {
		// 'routeHub' is the hub receiving url changes
		'routeHub; CHANGE': () => {
			this.displayView();
		},
	});

	postDisplay() {
		this.displayView();
	}


	private displayView() {
		const newPath = this.hasNewPathAt(1, defaultPath);
		// update this view/content only if the path has changed
		if (newPath != null) {
			const subViewClass = pathToView[newPath];
			display(new subViewClass, this.main, 'empty');

			// update the tab
			const href = `/_spec/${newPath}`;
			for (const tab of all(this.el, '.tab-bar a')) {
				const tabHref = tab.getAttribute('href');
				if (tab.classList.contains('sel') && tabHref !== href) {
					tab.classList.remove('sel');
				} else if (tabHref === href) {
					tab.classList.add('sel');
				}
			}
		}
	}
}