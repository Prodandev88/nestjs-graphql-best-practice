import {
	Entity,
	ObjectIdColumn,
	Column,
	BeforeInsert,
	CreateDateColumn,
	UpdateDateColumn
} from 'typeorm'
import { IsString, IsNotEmpty, IsArray } from 'class-validator'
import * as uuid from 'uuid'
import { PermissionInfo } from '../../graphql'

@Entity()
export class UserPermission {
	@ObjectIdColumn()
	_id: string

	@Column()
	userId: string

	@Column()
	siteId: string

	@Column()
	siteName: string

	@Column()
	permissions: PermissionInfo[]

	@CreateDateColumn()
	createdAt: string
	@UpdateDateColumn()
	updatedAt: string

	@BeforeInsert()
	async b4create() {
		this._id = await uuid.v1()
	}
}
