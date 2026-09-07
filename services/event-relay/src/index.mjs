import pg from 'pg';
import { Kafka } from 'kafkajs';
const {Pool}=pg;
const pool=new Pool({connectionString:process.env.DATABASE_URL});
const brokers=(process.env.KAFKA_BROKERS||'localhost:9092').split(',').map(x=>x.trim()).filter(Boolean);
const kafka=new Kafka({clientId:'urbis-event-relay',brokers});
const producer=kafka.producer({allowAutoTopicCreation:true});
await producer.connect();
const topic=process.env.KAFKA_TOPIC||'urbis.domain-events';
async function tick(){
  const client=await pool.connect();
  try{
    await client.query('BEGIN');
    const q=await client.query(`SELECT id,topic,entity_type,entity_id,payload,created_at FROM realtime_outbox WHERE published_at IS NULL ORDER BY created_at LIMIT 100 FOR UPDATE SKIP LOCKED`);
    for(const row of q.rows){
      await producer.send({topic,messages:[{key:String(row.entity_id||row.id),value:JSON.stringify(row),headers:{'urbis-topic':String(row.topic)}}]});
      await client.query(`UPDATE realtime_outbox SET published_at=now() WHERE id=$1`,[row.id]);
    }
    await client.query('COMMIT');
  }catch(e){await client.query('ROLLBACK');console.error('relay_tick_failed',e);}finally{client.release();}
}
const timer=setInterval(tick,1000);timer.unref();await tick();
process.on('SIGTERM',async()=>{clearInterval(timer);await producer.disconnect();await pool.end();process.exit(0)});
