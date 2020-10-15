
import {
	Raycaster, Vector2, Vector3
} from "three";
import { camera } from './threeManager';

import * as menuUI from './menuUI'
import * as tutorialUI from './tutorialUI'
import state from './state'

import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader';
import * as vrController from './vrController'


const gltfLoader = new GLTFLoader();
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath('./libs/draco/');
gltfLoader.setDRACOLoader(dracoLoader);

let menu = null;
let tutorial = null;

const screenRayCaster = new Raycaster();
screenRayCaster.far = 10;
const rayPos = new Vector2();
const mousePos = new Vector2();

export const init = async ()=>{
	menu = menuUI.build();
	tutorial = tutorialUI.build(tutorialUI.TUTORIAL.START);
	state.uis.push(menu.quad, tutorial.quad);
	addControls();
	state.models = await loadModels();

	document.addEventListener(state.START_FIXING, hide);
	document.addEventListener(state.STOP_FIXING, show);
}

const addControls = ()=>{
	addMouseControls();
}

let activeObject = null;
const posCalc = new Vector3();
const oldPos = new Vector3();
const pos = new Vector3();

const addMouseControls = ()=>{

	const rayCast = (clientX, clientY) => {
		rayPos.x = (clientX/window.innerWidth)*2-1;
		rayPos.y = -(clientY/window.innerHeight)*2+1;
		screenRayCaster.setFromCamera(rayPos, camera );
		const intersects = screenRayCaster.intersectObjects(state.uis);
		return intersects.pop();
	}

	const handleMouseDown = (down, e) =>{
		const intersect = rayCast(e.clientX, e.clientY);
		mousePos.set(e.clientX, e.clientY);
		if(intersect){
			const material = intersect.object.material;
			const uv = material.map.transformUv(intersect.uv);
			if(intersect.object.testCollision){
				intersect.object.testCollision(uv, down);
				activeObject = intersect.object;
			}
		}
		if(!down){
			state.uis.forEach(ui => {if(ui.resetCollision) ui.resetCollision()});
			activeObject = null;
		}
	}
	const handleMouseMove = e=>{
		if(!activeObject) return;

		let distance;

		posCalc.set(( mousePos.x / window.innerWidth ) * 2 - 1,	- ( mousePos.y / window.innerHeight ) * 2 + 1,0.5 );
		posCalc.unproject(camera);
		posCalc.sub( camera.position ).normalize();
		distance = ( activeObject.position.z - camera.position.z ) / posCalc.z;
		oldPos.copy( camera.position ).add( posCalc.multiplyScalar( distance ) );

		posCalc.set(( e.clientX / window.innerWidth ) * 2 - 1,	- ( e.clientY / window.innerHeight ) * 2 + 1,0.5 );
		posCalc.unproject(camera);
		posCalc.sub( camera.position ).normalize();
		distance = ( activeObject.position.z - camera.position.z ) / posCalc.z;
		pos.copy( camera.position ).add( posCalc.multiplyScalar( distance ) );

		const diff = pos.sub(oldPos);

		mousePos.set(e.clientX, e.clientY)

		activeObject.handleDrag(diff.x, diff.y);
	}

	document.addEventListener('mousedown', e=>{handleMouseDown(true, e)});
	document.addEventListener('mouseup', e=>{handleMouseDown(false, e)});
	document.addEventListener('mousemove', e=>handleMouseMove(e));
}

export const loadModel = url => {
	return new Promise((resolve, reject) => {
		gltfLoader.load(
			url,
			gltf => {
				resolve(gltf.scene);
			},
			() => {},
			error => {
				reject(error);
			}
		)
	})
}

export const loadModels = () => {
	const requiredModelUrls = [
		'./oculustouch/oculusTouchController-left.gltf',
		'./oculustouch/oculusTouchController-right.gltf'];
	const promises = [];
	requiredModelUrls.forEach(url => {
		promises.push(
			loadModel(url)
		)
	});
	return Promise.all(promises);
}

export const show = ()=>{
	menuUI.ui.quad.visible = true;
	vrController.show();
}
export const hide = ()=>{
	menuUI.ui.quad.visible = false;
	vrController.hide();
}
