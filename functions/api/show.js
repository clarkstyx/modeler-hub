// The craft-show config, for the order button inside the modelers.
import show from '../../show.json';
import { publicShow } from '../_lib/show.js';

export function onRequestGet() {
  return Response.json(publicShow(show), { headers: { 'Cache-Control': 'no-store' } });
}
