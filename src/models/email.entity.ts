import {
	Entity,
	ObjectIdColumn,
	Column,
	BeforeInsert,
	BeforeUpdate
} from 'typeorm'
import { IsNotEmpty } from 'class-validator'
import * as uuid from 'uuid'

enum Type {
	VERIFY_EMAIL,
	FORGOT_PASSWORD
}

@Entity({
	name: 'emails',
	orderBy: {
		createdAt: 'DESC'
	}
})
export class Email {
	@ObjectIdColumn()
	_id: string

	@Column()
	@IsNotEmpty()
	userId: string

	@Column()
	@IsNotEmpty()
	type: Type

	@Column()
	@IsNotEmpty()
	isOpened: boolean

	@Column()
	createdAt: number
	@Column()
	updatedAt: number

	constructor(params: any) {
		Object.assign(this, params)
	}

	@BeforeInsert()
	save() {
		this._id = uuid.v1()
		this.isOpened = false
		this.createdAt = +new Date()
		this.updatedAt = +new Date()
	}

	@BeforeUpdate()
	update() {
		this.updatedAt = +new Date()
	}
}
