import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

@Injectable()
export class ObjectStorageService implements OnModuleDestroy {
  private readonly driver=(process.env.URBIS_OBJECT_STORE_DRIVER??'LOCAL').toUpperCase();
  private readonly localRoot=process.env.URBIS_LOCAL_STORAGE_DIR??path.resolve(process.cwd(),'storage/evidence');
  private readonly bucket=process.env.S3_BUCKET??'urbis-evidence';
  private readonly s3?:S3Client;
  constructor(){
    if(this.driver==='S3'){
      this.s3=new S3Client({
        region:process.env.S3_REGION??'us-east-1',
        endpoint:process.env.S3_ENDPOINT,
        forcePathStyle:String(process.env.S3_FORCE_PATH_STYLE??'true').toLowerCase()==='true',
        credentials:process.env.S3_ACCESS_KEY_ID&&process.env.S3_SECRET_ACCESS_KEY?{accessKeyId:process.env.S3_ACCESS_KEY_ID,secretAccessKey:process.env.S3_SECRET_ACCESS_KEY}:undefined
      });
    }
  }
  async putContentAddressed(buffer:Buffer,contentType:string,extension:string){
    const hash=crypto.createHash('sha256').update(buffer).digest('hex');const key=`sha256/${hash.slice(0,2)}/${hash}${extension}`;
    if(this.driver==='S3'){
      if(!this.s3)throw new Error('S3 client unavailable');await this.s3.send(new PutObjectCommand({Bucket:this.bucket,Key:key,Body:buffer,ContentType:contentType,Metadata:{sha256:hash},ServerSideEncryption:'AES256'}));return {driver:'S3',objectKey:key,sha256:hash,byteLength:buffer.length};
    }
    const file=path.join(this.localRoot,key);await fs.mkdir(path.dirname(file),{recursive:true});try{await fs.writeFile(file,buffer,{flag:'wx'});}catch(e:any){if(e?.code!=='EEXIST')throw e;}return {driver:'LOCAL',objectKey:key,sha256:hash,byteLength:buffer.length};
  }
  async onModuleDestroy(){this.s3?.destroy();}
}
