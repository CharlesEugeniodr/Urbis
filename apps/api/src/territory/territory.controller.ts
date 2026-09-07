import { BadRequestException, Controller, Get, Param, Query } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Controller('v1/territory')
export class TerritoryController {
  constructor(private readonly db:DatabaseService){}

  @Get('cep/:cep')
  async byCep(@Param('cep') cep:string){
    const normalized=/^\d{8}$/.test(cep)?`${cep.slice(0,5)}-${cep.slice(5)}`:cep;
    if(!/^\d{5}-\d{3}$/.test(normalized)) throw new BadRequestException('CEP inválido');
    const q=await this.db.query(`SELECT cep,street_name,street_type,neighborhood_name_source,raw_line FROM postal_addresses WHERE cep=$1 ORDER BY street_name`,[normalized]);
    return {cep:normalized,count:q.rowCount??0,records:q.rows};
  }

  @Get('stats')
  async stats(){
    const q=await this.db.query(`
      SELECT count(*)::int AS segment_count,
             count(DISTINCT street_name)::int AS street_count,
             count(DISTINCT neighborhood_name)::int AS neighborhood_count,
             count(DISTINCT zone_name)::int AS zone_count,
             round((sum(ST_Length(geom::geography))/1000.0)::numeric,3) AS geometry_length_km
      FROM street_segments`);
    return q.rows[0];
  }

  @Get('nearest')
  async nearest(@Query('lat') latRaw:string,@Query('lon') lonRaw:string,@Query('limit') limitRaw='5'){
    const lat=Number(latRaw),lon=Number(lonRaw),limit=Math.max(1,Math.min(Number(limitRaw)||5,25));
    if(!Number.isFinite(lat)||!Number.isFinite(lon)||lat<-90||lat>90||lon<-180||lon>180) throw new BadRequestException('lat/lon inválidos');
    const q=await this.db.query(`SELECT * FROM urbis_nearest_street($1,$2,$3)`,[lon,lat,limit]);
    return {query:{lat,lon},results:q.rows};
  }

  @Get('streets')
  async streets(@Query('minLon') minLonRaw:string,@Query('minLat') minLatRaw:string,@Query('maxLon') maxLonRaw:string,@Query('maxLat') maxLatRaw:string,@Query('limit') limitRaw='1000'){
    const vals=[minLonRaw,minLatRaw,maxLonRaw,maxLatRaw].map(Number),limit=Math.max(1,Math.min(Number(limitRaw)||1000,5000));
    if(vals.some(v=>!Number.isFinite(v))) throw new BadRequestException('bbox obrigatório: minLon,minLat,maxLon,maxLat');
    const [minLon,minLat,maxLon,maxLat]=vals;
    const q=await this.db.query(`
      SELECT id,cep,street_type,street_name,neighborhood_name,zone_name,source_properties,
             ST_AsGeoJSON(geom)::json AS geometry
      FROM street_segments
      WHERE geom && ST_MakeEnvelope($1,$2,$3,$4,4326)
      ORDER BY id LIMIT $5`,[minLon,minLat,maxLon,maxLat,limit]);
    return {type:'FeatureCollection',count:q.rowCount??0,features:q.rows.map((r:any)=>({type:'Feature',id:r.id,properties:{cep:r.cep,street_type:r.street_type,street_name:r.street_name,neighborhood_name:r.neighborhood_name,zone_name:r.zone_name,...r.source_properties},geometry:r.geometry}))};
  }
}
