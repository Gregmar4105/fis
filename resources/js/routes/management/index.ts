import terminals from './terminals'
import gates from './gates'
import baggageBelts from './baggage-belts'
const management = {
    terminals: Object.assign(terminals, terminals),
gates: Object.assign(gates, gates),
baggageClaims: Object.assign(baggageClaims, baggageClaims),
}

export default management