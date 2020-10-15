import {
	CanvasTexture,
	LinearFilter,
	Vector2,
	Vector3,
	Matrix4,
	Frustum
} from 'three';
import RegionUI from './regionUI';
import state from './state';
import {
	gl,
	camera
} from './threeManager';
import canvasQuad from './canvasQuad'

export const regions = [];

const canvas = document.createElement('canvas');
canvas.width = canvas.height = 32;

const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

const fixTexture = new CanvasTexture(canvas);
fixTexture.anisotropy = gl.capabilities.getMaxAnisotropy();
fixTexture.minFilter = LinearFilter;
let fixing = false;
let timeStart = null;
let timeEnd = null;

let timer = canvasQuad([0.2, 0.2], ['10:00', 'center', '#FFF']);
timer.quad.position.z += 0.1;
timer.quad.visible = false;

export const spawnRegion = pos => {
	const region = new RegionUI(pos);
	regions.push(region);
	state.uis.push(region.ui.quad)
}

export const startFixRegions = () => {
	if(fixing || regions.length === 0) return;
	fixing = true;
	gl.setClearColor('#000');
	timer.quad.visible = true;
	timeStart = Date.now();
	timeEnd = timeStart + (!timeEnd ? 1000 * 60 * 10 : 1000 * 60 * 60);
	update();
	regions.forEach(region => {
		region.ui.quad.material.oldMap = region.ui.quad.material.map;
		region.ui.quad.material.map = fixTexture;
	})
	document.dispatchEvent(new Event(state.START_FIXING));
}
export const update = () => {
	if (fixing) {
		const elapsed = Date.now() - timeStart;
		handleAudio(elapsed);
		handleTimer();
		updateFixTexture();
		if(Date.now() > timeEnd){
			document.dispatchEvent(new Event(state.STOP_FIXING));
			var audio = new Audio('./audio/success.ogg');
			audio.play();
			reset();
		}
	}
}
const reset = ()=>{
	if(!fixing) return;
	fixing = false;
	timer.quad.visible = false;
	if (audioPlaying) {
		oscillator.stop();
		audioPlaying = false;
	}
	regions.forEach(region => {
		region.ui.quad.material.map = region.ui.quad.material.oldMap;
	})
}

const updateFixTexture = () => {
	const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
	const color = Math.floor(Math.random() * 3)
	for (let i = 0; i < imgData.data.length; i += 4) {
		imgData.data[i] = color === 0 ? 255 : 0;
		imgData.data[i + 1] = color === 1 ? 255 : 0;
		imgData.data[i + 2] = color === 2 ? 255 : 0;
		imgData.data[i + 3] = 255
	}
	ctx.putImageData(imgData, 0, 0);
	regions.forEach(region => {
		region.ui.quad.material.map.needsUpdate = true;
	})
}

const audioCtx = new(window.AudioContext || window.webkitAudioContext)();
let oscillator;

const frequencies = [60, 70, 80, 90, 120, 144];
let currentFrequency = -1;
let audioPlaying = false;

const handleAudio = elapsed => {
	const targetFrequency = Math.floor(((elapsed / 1000) % 60) / 6)
	if (currentFrequency != targetFrequency) {
		if (audioPlaying) {
			oscillator.stop();
			audioPlaying = false;
		}
		const frequency = frequencies[targetFrequency];
		if (frequency) playNote(frequency);
		currentFrequency = targetFrequency;
	}
}
const playNote = frequency => {
	oscillator = audioCtx.createOscillator();
	oscillator.type = 'sine';
	oscillator.connect(audioCtx.destination);
	oscillator.frequency.value = frequency;
	oscillator.start();
	audioPlaying = true;
}

let xDirection = Math.random() > .5 ? 1 : -1;
let yDirection = Math.random() > .5 ? 1 : -1;
const posCalc = new Vector3();
const pos = new Vector3();
const tl = new Vector2();
const br = new Vector2();


let vrEdgeX = null;
let vrEdgeY = null;
let searchStep = 0;

const handleTimer = () => {

	const timeLeft = (timeEnd - Date.now()) / 1000;
	const minutes = String(Math.floor(timeLeft / 60)).padStart(2, '0');
	const seconds = String(Math.floor(timeLeft % 60)).padStart(2, '0');
	timer.updateText(`${minutes}:${seconds}`)

	const speed = 0.01;
	timer.quad.position.x += speed * xDirection;
	timer.quad.position.y += speed * yDirection;

	try {
		const vrCameras = gl.xr.getCamera(camera);
		while (!vrEdgeX) {
			searchStep += 0.1;
			posCalc.copy(timer.quad.position);
			posCalc.x += searchStep;
			vrCameras.updateMatrix();
			vrCameras.updateMatrixWorld();
			const frustum = new Frustum();
			frustum.setFromProjectionMatrix(new Matrix4().multiplyMatrices(vrCameras.projectionMatrix, vrCameras.matrixWorldInverse));
			if (!frustum.containsPoint(posCalc)) {
				searchStep = 0;
				vrEdgeX = posCalc.x;
			}
		}
		while (!vrEdgeY) {
			searchStep += 0.1;
			posCalc.copy(timer.quad.position);
			posCalc.y += searchStep;
			vrCameras.updateMatrix();
			vrCameras.updateMatrixWorld();
			const frustum = new Frustum();
			frustum.setFromProjectionMatrix(new Matrix4().multiplyMatrices(vrCameras.projectionMatrix, vrCameras.matrixWorldInverse));
			if (!frustum.containsPoint(posCalc)) {
				vrEdgeY = posCalc.y;
			}
		}
		tl.set(-vrEdgeX, -vrEdgeY);
		br.set(vrEdgeX, vrEdgeY);
	} catch (e) {
		let distance;

		// top left
		posCalc.set(-1, -1, 0.5);
		posCalc.unproject(camera);
		posCalc.sub(camera.position).normalize();
		distance = (timer.quad.position.z - camera.position.z) / posCalc.z;
		pos.copy(camera.position).add(posCalc.multiplyScalar(distance));
		tl.copy(pos);

		// bottom right
		posCalc.set(1, 1, 0.5);
		posCalc.unproject(camera);
		posCalc.sub(camera.position).normalize();
		distance = (timer.quad.position.z - camera.position.z) / posCalc.z;
		pos.copy(camera.position).add(posCalc.multiplyScalar(distance));
		br.copy(pos);
	}

	if (xDirection > 0 && timer.quad.position.x > br.x) xDirection *= -1;
	if (yDirection > 0 && timer.quad.position.y > br.y) yDirection *= -1;
	if (xDirection < 0 && timer.quad.position.x < tl.x) xDirection *= -1;
	if (yDirection < 0 && timer.quad.position.y < tl.y) yDirection *= -1;

}
