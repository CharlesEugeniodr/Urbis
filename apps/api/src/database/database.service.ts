import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Pool, PoolClient, QueryResultRow } from 'pg';

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  private readonly pool: Pool;
  constructor(){
    const connectionString=process.env.DATABASE_URL;
    if(!connectionString) throw new Error('DATABASE_URL is required for urbis-api');
    this.pool=new Pool({connectionString,max:Number(process.env.DB_POOL_MAX??20),application_name:'urbis-api'});
  }
  query<T extends QueryResultRow = QueryResultRow>(text:string, values:unknown[]=[]){ return this.pool.query<T>(text,values); }
  async tx<T>(fn:(client:PoolClient)=>Promise<T>):Promise<T>{
    const client=await this.pool.connect();
    try{ await client.query('BEGIN'); const out=await fn(client); await client.query('COMMIT'); return out; }
    catch(err){ await client.query('ROLLBACK'); throw err; }
    finally{ client.release(); }
  }
  async onModuleDestroy(){ await this.pool.end(); }
}
