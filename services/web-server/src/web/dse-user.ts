// <origin src="https://raw.githubusercontent.com/BriteSnow/cloud-starter/master/services/web-server/src/web/dse-user.ts" />
// (c) 2021 BriteSnow, inc - This code is licensed under MIT license (see LICENSE for details)

import { userDao } from '#common/da/daos.js';
import { ApiKtx, ApiRouter, routePost, success } from '#common/web/koa-utils.js';
import { pwdCheck } from '#common/security/password.js'
import { Err } from '#common/error.js';
import { symbolDic } from '#common/utils.js';
import { getSysContext } from '#common/user-context.js';
import { setAuth } from '#common/web/auth.js';

const ERROR = symbolDic(
	'CHANGE_PWD_FAILED'
);


class UserDse extends ApiRouter {

	@routePost('/dse/user/setPwd')
	async setPwd(ktx: ApiKtx) {
		const ctx = ktx.state.utx;
		const sysCtx = await getSysContext();
		const oldPwd = ktx.request.body.oldPwd;
		const newPwd = ktx.request.body.newPwd;
		const userCredential = await userDao.getUserCredForLogin(sysCtx, { id: ctx.userId });

		try {
			if (pwdCheck(oldPwd, userCredential)) {
				await userDao.setPwd(sysCtx, { id: ctx.userId }, newPwd);

				// keep session for continue
				await setAuth(ktx, await userDao.getUserCredForLogin(sysCtx, { id: ctx.userId }));
				return success();
			}
		} catch (e) { 
			if (e instanceof Err) {
				throw new Err({
					svrCode: ERROR.CHANGE_PWD_FAILED,
					usrMsg: 'old password was wrong'
				});
			} else {
				throw new Err(ERROR.CHANGE_PWD_FAILED);
			}
		}
	}
}


export default function apiRouter(prefix?: string) { return new UserDse(prefix) };