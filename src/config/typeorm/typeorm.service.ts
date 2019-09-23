import { Injectable } from '@nestjs/common'
import { TypeOrmOptionsFactory, TypeOrmModuleOptions } from '@nestjs/typeorm'
import { getMetadataArgsStorage } from 'typeorm'
import * as dotenv from 'dotenv'

dotenv.config()
import config from '../../config.env'

// COMPLETE:
@Injectable()
export class TypeormService implements TypeOrmOptionsFactory {
	async createTypeOrmOptions(): Promise<TypeOrmModuleOptions> {
		return process.env.NODE_ENV === 'testing'
			? {
					type: 'mongodb',
					url: 'mongodb://admin:chnirt1803@ds147420.mlab.com:47420/chnirt-nest',
					entities: getMetadataArgsStorage().tables.map(tbl => tbl.target),
					synchronize: true,
					useNewUrlParser: true,
					useUnifiedTopology: true,
					logging: true
			  }
			: {
					type: 'mongodb',
					...config.orm,
					entities: getMetadataArgsStorage().tables.map(tbl => tbl.target),
					synchronize: true,
					useNewUrlParser: true,
					useUnifiedTopology: true,
					logging: true
			  }
	}
}
