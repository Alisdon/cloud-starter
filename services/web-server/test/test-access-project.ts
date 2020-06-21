import * as assert from 'assert';
import { saveProjectRole } from 'common/da/access-project';
import { projectDao } from 'common/da/daos';
import { Project } from 'shared/entities';
import { initSuite } from './t-utils';


describe("test-access-project", async function () {

	const suite = initSuite(this);

	// test CRUD  project from same user (i.e. owner)
	it('access-project-self', async function () {

		// create project from userA, should work
		let testProject01Id = await projectDao.create(suite.userACtx, { name: 'test-access-project-01' });

		// test get, should work
		let testProject01: Project | null = await projectDao.get(suite.userACtx, testProject01Id);
		assert.strictEqual(testProject01.name, 'test-access-project-01');

		// test update from userA, should work
		await projectDao.update(suite.userACtx, testProject01Id, { name: 'test-access-project-01-updated' });
		testProject01 = await projectDao.get(suite.userACtx, testProject01Id);
		assert.strictEqual(testProject01.name, 'test-access-project-01-updated');

		// test remove project from userA, should work
		await projectDao.remove(suite.userACtx, testProject01Id);
		testProject01 = await projectDao.first(suite.userACtx, { id: testProject01Id });
		assert.strictEqual(testProject01, null, 'project01 should be null');

	});

	// test CRUD project access from a user that do not have any access to the project
	it('access-project-stranger', async function () {

		// create project from userA, should work
		let testProject01Id = await projectDao.create(suite.userACtx, { name: 'test-access-project-01' });
		suite.toClean('project', testProject01Id);

		// test read from userB, should work
		await assert.rejects(projectDao.get(suite.userBCtx, testProject01Id),
			suite.errorNoAccess, 'UserB shoul dnot have read access to userA project');

		// test update from userB, should fail
		await assert.rejects(projectDao.update(suite.userBCtx, testProject01Id, { name: 'test-access-project-01-updated' }),
			suite.errorNoAccess, 'UserB schould not have write access to userA project');

		// test remove from userB, should fail
		await assert.rejects(projectDao.remove(suite.userBCtx, testProject01Id),
			suite.errorNoAccess, 'UserB schould not have remove access to userA project');
	});

	// test CRUD project access from a viewer user
	it('access-project-viewer', async function () {

		// create project from userA, should work
		let testProject01Id = await projectDao.create(suite.userACtx, { name: 'test-access-project-01' });
		suite.toClean('project', testProject01Id);

		// assign 'viewer' role to userB
		await saveProjectRole(suite.userBCtx.userId, testProject01Id, 'pr_viewer');

		// test read from userB, should work
		const testProject01 = await projectDao.get(suite.userBCtx, testProject01Id);
		assert.strictEqual(testProject01.name, 'test-access-project-01');

		// test update from userB, should fail
		await assert.rejects(projectDao.update(suite.userBCtx, testProject01Id, { name: 'test-access-project-01-updated' }),
			suite.errorNoAccess, 'UserB schould not have write access to userA project');

		// test remove from userB, should fail
		await assert.rejects(projectDao.remove(suite.userBCtx, testProject01Id),
			suite.errorNoAccess, 'UserB schould not have remove access to userA project');
	});

	// test CRUD project access from member user
	it('access-project-member', async function () {

		// create project from userA, should work
		let testProject01Id = await projectDao.create(suite.userACtx, { name: 'test-access-project-01' });
		suite.toClean('project', testProject01Id);

		// assign 'member' role to userB
		await saveProjectRole(suite.userBCtx.userId, testProject01Id, 'pr_member');

		// test read from userB, should work
		const testProject01 = await projectDao.get(suite.userBCtx, testProject01Id);
		assert.strictEqual(testProject01.name, 'test-access-project-01');

		// test update from userB, should fail
		await assert.rejects(projectDao.update(suite.userBCtx, testProject01Id, { name: 'test-access-project-01-updated' }),
			suite.errorNoAccess, 'UserB schould not have write access to userA project');

		// test update from userB, should fail
		await assert.rejects(projectDao.remove(suite.userBCtx, testProject01Id),
			suite.errorNoAccess, 'UserB schould not have remove access to userA project');

		// TODO need to test ticket and label when they are implemented
	});

	// test CRUD project access from manager user
	it('access-project-manager', async function () {

		// create project from userA, should work
		let testProject01Id = await projectDao.create(suite.userACtx, { name: 'test-access-project-01' });
		suite.toClean('project', testProject01Id);

		// assign 'manager' role to userB
		saveProjectRole(suite.userBCtx.userId, testProject01Id, 'pr_admin');

		// test read from userB, should work
		let testProject01 = await projectDao.get(suite.userBCtx, testProject01Id);
		assert.strictEqual(testProject01.name, 'test-access-project-01');

		// test update from userB, should work
		await projectDao.update(suite.userBCtx, testProject01Id, { name: 'test-access-project-01-updated' }),
			testProject01 = await projectDao.get(suite.userBCtx, testProject01Id);
		assert.strictEqual(testProject01.name, 'test-access-project-01-updated');

		// test update from userB, should fail
		await assert.rejects(projectDao.remove(suite.userBCtx, testProject01Id),
			suite.errorNoAccess, 'UserB schould not have remove access to userA project');

	});

});