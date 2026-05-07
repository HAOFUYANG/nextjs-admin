import { Global, Module } from '@nestjs/common';
import { db } from './connection';

const DB_PROVIDER = Symbol('DB');

@Global()
@Module({
  providers: [
    {
      provide: DB_PROVIDER,
      useValue: db,
    },
  ],
  exports: [DB_PROVIDER],
})
export class DbModule {}
