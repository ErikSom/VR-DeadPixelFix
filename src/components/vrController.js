import {
	Geometry,
	Vector3,
	Mesh,
	CircleGeometry,
	MeshBasicMaterial,
	Raycaster,
	Quaternion,
	CatmullRomCurve3,
	TubeGeometry
} from "three";
import {
	gl,
	scene,
	spawnPlane
} from './threeManager'
import state from './state'
import settings from '../settings'

const INPUT_MAP = {
	BUTTONS: {
		TRIGGER: 0,
		GRAB: 1,
		GOGRAB: 2,
		JOYSTICK: 3,
		X: 4,
		Y: 5,
		A: 4,
		B: 5
	},
	AXES: {
		X: 2,
		Y: 3,
	}
}

const quat = new Quaternion();
const raycaster = new Raycaster();
raycaster.far = 10.0;

let controllers = [];
let xrSession = false;
let activeObject = null;

let oldCursorPos = new Vector3();

export const dragPlane = spawnPlane(scene, {position:[0, 0, -settings.uiDepth-0.01], geometry:[100, 100, 2]});
dragPlane.material.opacity = 0;

export const init = () => {
	const controller1 = gl.xr.getController(0);
	scene.add(controller1);

	const controller2 = gl.xr.getController(1);
	scene.add(controller2);

	intializePointer(controller1);
	intializePointer(controller2);

	const startXRSession = () => {
		xrSession = gl.xr.getSession();
		xrSession.addEventListener('inputsourceschange', () => {
			const xrInput = xrSession.inputSources;
			if (!xrInput || !xrInput[0].profiles) return;
			const isQuest = xrInput[0].profiles.find(profile=>profile.indexOf("oculus")>=0).length>0;
			const isGenericTriggerDevice = xrInput[0].profiles.find(profile=>profile.startsWith('generic-trigger')).length>0;
			if (isQuest || isGenericTriggerDevice) {
				const leftIndexZero = xrInput[0].handedness === "left";
				let leftController = xrInput[(leftIndexZero ? 0 : 1)] || {gamepad:{buttons:[{pressed:false},{pressed:false}]}};
				leftController.gameObject = leftIndexZero ? controller1 : controller2;
				let rightController = xrInput[(leftIndexZero ? 1 : 0)] || {gamepad:{buttons:[{pressed:false},{pressed:false}]}};;
				rightController.gameObject = leftIndexZero ? controller2 : controller1;
				controllers = [leftController, rightController];

				leftController.buttonsDown = [];
				rightController.buttonsDown = [];

				// visually center the controllers
				state.models[0].children.forEach(obj => {
					obj.geometry.translate(0.01, 0, 0);
				})
				state.models[1].children.forEach(obj => {
					obj.geometry.translate(-0.01, 0, 0);
				})

				leftController.gameObject.add(state.models[0]);
				rightController.gameObject.add(state.models[1]);
			}
		});
		document.dispatchEvent(new Event(state.GOVR));
	}
	gl.xr.addEventListener('sessionstart', startXRSession);
}
const raycastDestination = new Vector3();
const localZero = new Vector3();

export const show = ()=>{
	controllers.forEach(controller=>{
		controller.gameObject.children.forEach(obj => obj.visible = true);
		controller.gameObject.cursor.material.opacity = 1.0;
		controller.gameObject.cursorShadow.material.opacity = 1.0;
	})
}

export const hide = ()=>{
	controllers.forEach(controller=>{
		controller.gameObject.children.forEach(obj => obj.visible = false);
		controller.gameObject.cursor.material.opacity = 0;
		controller.gameObject.cursorShadow.material.opacity = 0;
	})
}

export const update = () => {
	if (xrSession) {
		checkElementInteraction();
		updateInput();
	}
}


const updateInput = () => {
	const [leftController, rightController] = controllers;
	// update input
	for (let i = 0; i < leftController.gamepad.buttons.length; i++) {
		// reset button states
		leftController.buttonsDown[i] = leftController.gamepad.buttons[i].pressed;
	}
	for (let i = 0; i < rightController.gamepad.buttons.length; i++) {
		// reset button states
		rightController.buttonsDown[i] = rightController.gamepad.buttons[i].pressed;
	}
}

const checkElementInteraction = () => {
	if (!screen) return;

	controllers.forEach(controller => {

		raycastDestination.set(0, 0, -1);
		controller.gameObject.getWorldQuaternion(quat);
		raycastDestination.applyQuaternion(quat);

		localZero.set(0, 0, 0);
		controller.gameObject.localToWorld(localZero);

		raycaster.set(localZero, raycastDestination);

		controller.gameObject.cursor.visible = false;
		controller.gameObject.cursorShadow.visible = false;

		const dragPlaneIntersect = raycaster.intersectObjects([dragPlane]);
		const dragIntersect = dragPlaneIntersect[0];

		const intersects = raycaster.intersectObjects(state.uis);
		for (let i = 0; i < intersects.length; i++) {
			const intersect = intersects[0];
			var material = intersect.object.material;
			var uv = material.map.transformUv(intersect.uv);

			if (intersect.object.testCollision) {
				if (getButtonState(controller, INPUT_MAP.BUTTONS.TRIGGER, 'down') ||
					getButtonState(controller, INPUT_MAP.BUTTONS.GRAB, 'down') ||
					getButtonState(controller, INPUT_MAP.BUTTONS.GOGRAB, 'down')) {
					// button down
					if(!activeObject){
						oldCursorPos.copy(dragIntersect.point)
						intersect.object.testCollision(uv, true);
						activeObject = intersect.object;
					}
				}else if(getButtonState(controller, INPUT_MAP.BUTTONS.TRIGGER, 'release') ||
						getButtonState(controller, INPUT_MAP.BUTTONS.GRAB, 'release') ||
						getButtonState(controller, INPUT_MAP.BUTTONS.GOGRAB, 'release')){
					// button up
					intersect.object.testCollision(uv, false);
				}
			}

			raycastDestination.set(0, 0, -1);

			raycastDestination.applyQuaternion(quat);
			raycastDestination.multiplyScalar(intersect.distance - 0.01);
			raycastDestination.add(localZero);

			if (intersect.face) {
				const n = intersect.face.normal.clone();
				n.transformDirection(intersect.object.matrixWorld);
				n.multiplyScalar(10);
				n.add(intersect.point);

				controller.gameObject.cursor.visible = true;
				controller.gameObject.cursorShadow.visible = true;


				controller.gameObject.worldToLocal(raycastDestination)
				controller.gameObject.cursor.position.copy(raycastDestination);
				controller.gameObject.cursor.lookAt(n);
				controller.gameObject.cursorShadow.position.copy(raycastDestination);
				controller.gameObject.cursorShadow.position.z -= 0.001;
				controller.gameObject.cursorShadow.lookAt(n);
			}
		}
		if (getButtonState(controller, INPUT_MAP.BUTTONS.TRIGGER, 'hold') ||
			getButtonState(controller, INPUT_MAP.BUTTONS.GRAB, 'hold') ||
			getButtonState(controller, INPUT_MAP.BUTTONS.GOGRAB, 'hold')) {
			// controller drag
			if(activeObject){
				const diff = dragIntersect.point.clone().sub(oldCursorPos);
				activeObject.handleDrag(diff.x, diff.y);
				oldCursorPos.copy(dragIntersect.point)
			}
		}
		if (getButtonState(controller, INPUT_MAP.BUTTONS.TRIGGER, 'release') ||
			getButtonState(controller, INPUT_MAP.BUTTONS.GRAB, 'release') ||
			getButtonState(controller, INPUT_MAP.BUTTONS.GOGRAB, 'release')) {
			// button up
			state.uis.forEach(ui => {if(ui.resetCollision) ui.resetCollision()});
			activeObject = null;
		}
	});
}


const getButtonState = (controller, id, state) =>{
	if(!controller.gamepad.buttons[id]) return false;
	switch(state){
		case 'release':
			return !controller.gamepad.buttons[id].pressed && controller.buttonsDown[id];
		case 'hold':
			return controller.gamepad.buttons[id].pressed && controller.buttonsDown[id];
		case 'down':
			return controller.gamepad.buttons[id].pressed && !controller.buttonsDown[id];
	}
	return false;
}


const laserMaterial = new MeshBasicMaterial({
	color: 0x555555,
	transparent: true,
});
const pointerMaterial = new MeshBasicMaterial({
	color: 0xDDDDDD,
	transparent: true
});
const pointerShadowMaterial = new MeshBasicMaterial({
	color: 0x333333,
	transparent: true
});
const intializePointer = controller => {
	const g = new Geometry();
	g.vertices.push(new Vector3(0, 0, -2.5));
	g.vertices.push(new Vector3(0, 0, 0));

	const geometry = new CircleGeometry(0.02, 12);
	const cursor = new Mesh(geometry, pointerMaterial);

	const geometryShadow = new CircleGeometry(0.03, 12);
	const cursorShadow = new Mesh(geometryShadow, pointerShadowMaterial);

	controller.add(cursor);
	controller.add(cursorShadow);

	controller.cursor = cursor;
	controller.cursorShadow = cursorShadow;

	const linePoints = [new Vector3(0, 0, -(settings.uiDepth + 1)), new Vector3(0, 0, -0.03)];
	var tubeGeometry = new TubeGeometry(
		new CatmullRomCurve3(linePoints),
		512,
		0.005,
		8,
		false
	);

	const line = new Mesh(tubeGeometry, laserMaterial);
	line.material.opacity = 0.5;
	controller.add(line);
}
