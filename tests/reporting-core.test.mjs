import test from 'node:test';import assert from 'node:assert/strict';import { occurrencesCsv,occurrencesXlsx,simplePdfReport } from '../core/reporting-core.mjs';
const r=[{protocol:'URB-1',categoryCode:'PAVEMENT',status:'RESOLVED',priority:'MEDIUM',territory:{neighborhood:'Centro'},createdAt:'2026-09-07T00:00:00Z',resolvedAt:'2026-09-07T01:00:00Z'}];
test('CSV exportável',()=>{const b=occurrencesCsv(r);assert.match(b.toString('utf8'),/URB-1/);assert.match(b.toString('utf8'),/Centro/);});
test('PDF mínimo válido',()=>{const b=simplePdfReport({lines:['URB-1']});assert.equal(b.subarray(0,5).toString(),'%PDF-');assert.match(b.toString('binary'),/%%EOF/);});
test('XLSX mínimo é pacote ZIP',()=>{const b=occurrencesXlsx(r);assert.equal(b.readUInt32LE(0),0x04034b50);assert.ok(b.includes(Buffer.from('xl/workbook.xml')));});
