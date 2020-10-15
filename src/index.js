import * as threeManager from './components/threeManager'
import * as menuManager from './components/menuManager'
import * as regionManager from './components/regionManager'
import * as vrController from './components/vrController'

const init = async ()=>{
    threeManager.init();
    await menuManager.init();
    vrController.init();
    threeManager.events.addEventListener('tick', update);
}
const update = ()=>{
    regionManager.update();
    vrController.update();
}
init();
