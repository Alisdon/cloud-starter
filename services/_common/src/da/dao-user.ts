// <origin src="https://raw.githubusercontent.com/BriteSnow/cloud-starter/master/services/common/src/da/dao-user.ts" />
// (c) 2019 BriteSnow, inc - This code is licensed under MIT license (see LICENSE for details)

/////////////////////
// User DAO. Advanced DAO to manage the security aspect of the user. 
////

import { QueryOptions, User, UserType } from "shared/entities";
import { freeze } from 'shared/utils';
import { createSalt, uuidV4 } from '../security/generators';
import { pwdEncrypt } from '../security/password';
import { PwdEncryptData } from '../security/password-types';
import { newUserContext, UserContext } from "../user-context";
import { AccessRequires } from "./access";
import { BaseDao } from "./dao-base";
import { getKnex } from "./db";


interface UserCredential extends Pick<User, 'username'> {
	salt: string;
	uuid: string;
	pwd: string;
}

export interface UserAuthCredential extends UserCredential, Pick<User, 'id' | 'type'> {
	key: string
};

interface CreateUserData {
	type?: UserType;
	username: string;
	clearPwd: string;
}


// default user columns for users
const USER_COLUMNS = ['id', 'uuid', 'username', 'type', 'cid', 'ctime', 'mid', 'mtime'];

// Security only columns, only to be used in getUserAuthCredential, 
const USER_SECURITY_COLUMNS = ['salt', 'key', 'pwd'];

// Credential for authentication used in 
const USER_AUTH_CREDENTIAL_COLUMNS = ['id', 'uuid', 'username', 'type', ...USER_SECURITY_COLUMNS];


export class UserDao extends BaseDao<User, number, QueryOptions<User>>{
	constructor() {
		super({ table: 'user', stamped: true, columns: USER_COLUMNS });
	}

	async getUserByUserName(ctx: UserContext, username: string): Promise<User | null> {
		return this.first(ctx, { username });
	}

	//#region    ---------- BaseDao Overrides ---------- 
	async create(ctx: UserContext, data: Partial<User>) {
		throw new Error('UserDao.create NOT AVAILABLE, use UserDao.createUser');
		return -1; // for TS.
	}

	@AccessRequires(['#sys', '#admin'])
	async remove(ctx: UserContext, id: number | number[]) {
		return super.remove(ctx, id);
	}

	@AccessRequires(['#sys', '#admin', '@id'])
	async update(ctx: UserContext, id: number, data: Partial<User>) {
		throw new Error('UserDao.update NOT AVAILABLE, use UserDao.updateUser');
		return -1; // for TS.
	}
	//#endregion ---------- /BaseDao Overrides ---------- 

	//#region    ---------- Query Override ---------- 
	/**
	 * Double precaution to make sure '.pwd' and '.key' are removed.
	 * Note: Here we log a code error so that we can fix the code approrietaly.
	 * @param user 
	 */
	processEntity(user: User) {
		// Check that we do not expose the security columns
		for (const col of USER_SECURITY_COLUMNS) {
			if ((<any>user)[col] !== undefined) {
				delete (<any>user)[col];
				console.log(`CODE ERROR - RECOVERED - UserDao processEntity had to remove '.${col}' for safety. Call completeQueryBuildWithQueryOptions.`)
			}
		}
		return user;
	}
	//#endregion ---------- /Query Override ---------- 

	//#region    ---------- Credential Methods ---------- 
	async createUser(ctx: UserContext, data: CreateUserData) {
		const userCredential = newUserCredential(data.username, data.clearPwd);
		const type = data.type;
		return await super.create(ctx, { ...userCredential, type });
	}


	@AccessRequires(['#sys'])
	async newContextFromUserId(ctx: UserContext, userId: number) {
		const user = await this.get(ctx, userId);
		return newUserContext(user);
	}


	/** 
	 * Return a user credential necessary to authenticate a user (.id, .username, .uuid, .salt, .pwd, .key). 
	 * IMPORTANT: This is the ONLY methods that should return the 'user.pwd' and 'user.key'
	 * IMPORTANT: This is only to be used for login password check, and request authentication.
	 **/
	@AccessRequires(['#sys']) // here only sys context should be able to call this one
	async getUserAuthCredentialByUuid(ctx: UserContext, uuid: string): Promise<UserAuthCredential> {
		return this.getUserAuthCredential(ctx, { uuid });
	}
	@AccessRequires(['#sys']) // here only sys context should be able to call this one
	async getUserAuthCredentialById(ctx: UserContext, id: number): Promise<UserAuthCredential> {
		return this.getUserAuthCredential(ctx, { id });
	}
	@AccessRequires(['#sys']) // here only sys context should be able to call this one
	async getUserAuthCredentialByUsername(ctx: UserContext, username: string): Promise<UserAuthCredential> {
		return this.getUserAuthCredential(ctx, { username });
	}

	private async getUserAuthCredential(ctx: UserContext, ref: { uuid: string }): Promise<UserAuthCredential>;
	private async getUserAuthCredential(ctx: UserContext, ref: { id: number }): Promise<UserAuthCredential>;
	private async getUserAuthCredential(ctx: UserContext, ref: { username: string }): Promise<UserAuthCredential>;
	private async getUserAuthCredential(ctx: UserContext, ref: { uuid?: string, id?: number, username?: string }): Promise<UserAuthCredential> {
		const k = await getKnex();
		let q = k(this.tableName);
		q.limit(1);
		q.columns(USER_AUTH_CREDENTIAL_COLUMNS);
		if (ref.uuid != null) {
			q.where('uuid', ref.uuid);
		} else if (ref.id != null) {
			q.where('id', ref.id);
		} else if (ref.username != null) {
			q.where('username', ref.username);
		} else {
			throw new Error(`Cannot find userWithCredential`);
		}
		const result = await q;
		if (!result || result.length < 1) {
			throw new Error(`Cannot find userWithCredential for ${ref.id ?? ref.uuid ?? ref.username}`);
		}
		return freeze(result[0]) as UserAuthCredential;
	}
	//#endregion ---------- /Credential Methods ---------- 
}
//#region    ---------- Utils ---------- 

/**
 * Create a new uuid, salt, and pwd given a username and clearPwd.
 * 
 * Use by registration and agent `npm run credential admin welcome` commands
 */
export function newUserCredential(username: string, clearPwd: string): UserCredential {
	const uuid = uuidV4();
	const salt = createSalt();
	const toEncrypt: PwdEncryptData = {
		uuid,
		username,
		clearPwd,
		salt,
	}

	const pwd = pwdEncrypt(toEncrypt);

	return {
		username,
		uuid,
		pwd,
		salt
	}
}
//#endregion ---------- /Utils ----------