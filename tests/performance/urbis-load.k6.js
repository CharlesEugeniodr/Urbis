import http from 'k6/http';import { check } from 'k6';
export const options={scenarios:{ten_thousand_per_minute:{executor:'constant-arrival-rate',rate:167,timeUnit:'1s',duration:'60s',preAllocatedVUs:100,maxVUs:500}},thresholds:{http_req_duration:['p(95)<300'],http_req_failed:['rate<0.01']}};
const BASE=__ENV.URBIS_BASE_URL||'http://127.0.0.1:3100';
export default function(){const r=http.get(`${BASE}/public/summary`);check(r,{'HTTP 200':x=>x.status===200});}
