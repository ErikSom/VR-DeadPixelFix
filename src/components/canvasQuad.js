import {
	CanvasTexture, LinearFilter
} from "three";
import settings from '../settings'

import { gl, spawnPlane, camera } from './threeManager';
export default (size, textOptions)=>{
	const quad = spawnPlane(camera, {geometry:[...size, 32]});

	const canvas = document.createElement('canvas');
	canvas.width = size[0]*512*settings.canvasResolution;
	canvas.height = size[1]*512*settings.canvasResolution;

	const ctx = canvas.getContext('2d', {alpha:true});
	ctx.imageSmoothingQuality = 'high';

	const canvasTexture = new CanvasTexture(canvas);
	canvasTexture.anisotropy = gl.capabilities.getMaxAnisotropy();
	canvasTexture.minFilter = LinearFilter;
	quad.material.map = canvasTexture;

	quad.position.z = -settings.uiDepth;

	let updateText = null;
	if(textOptions){
		updateText = txt=>{
			updateCtxText(ctx, canvas, txt, textOptions[1], textOptions[2]);
			quad.material.map.needsUpdate = true;
		}
		updateText(textOptions[0]);
	}

	return {quad, canvas, ctx, size, updateText};
}

const updateCtxText = (ctx, canvas, txt, align, color)=>{
	ctx.clearRect(0, 0, canvas.width, canvas.height);
	const fontSize = settings.uiFontSize * settings.canvasResolution
	ctx.font = `bold ${fontSize}px Arial`;
	ctx.fillStyle = color;
	ctx.textAlign = align;
	ctx.fillText(txt, canvas.width / 2, canvas.height / 2 + fontSize / 4);
}
