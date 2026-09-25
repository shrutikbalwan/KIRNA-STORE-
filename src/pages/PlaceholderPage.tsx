import type { RoutePath } from '../router'
import { routeDefinitions } from '../router'
export function PlaceholderPage({path}:{path:RoutePath}){const route=routeDefinitions.find(item=>item.path===path); return <section className="placeholder-page"><span className="section-kicker">COMING NEXT</span><h2>{route?.label}</h2><p>This workspace is ready for the next feature.</p></section>}
