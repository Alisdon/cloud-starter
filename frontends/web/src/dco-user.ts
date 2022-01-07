import { UserContext } from 'common/user-ctx';
import { webPost } from 'common/web-request';
import { QueryOptions } from 'shared/entities-base';
import { BaseDco, dcoHub } from './dco-base';

export class UserDao extends BaseDco<UserContext, QueryOptions<UserContext>> { 
	constructor() { 
		super('User')
	}
	
	async changePwd(props: { oldPwd: string, newPwd: string }): Promise<void> {
		if (props.oldPwd || props.newPwd) {
			const webResult = await webPost(`/api/dse/user/setPwd`, { body: props });
			
			if (!webResult.success) {
				throw new Error(webResult.error.message || webResult.error.code || 'UserDao.setPwd could not set the new password')
			}

			dcoHub.pub(this._entityType, 'changePwd', webResult.data);
			return webResult.data
		} else { 
			throw new Error('params is invalid')
		}
	}
}