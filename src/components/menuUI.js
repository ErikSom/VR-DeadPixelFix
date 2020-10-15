import canvasQuad from './canvasQuad'
import settings from '../settings'
import {
	gl
} from './threeManager';
import {
	Vector2
} from 'three';
import * as regionManager from './regionManager'

export let ui = canvasQuad([1, 1]);
let elements = [];

export const build = () => {
	drawY = 0;

	ui.ctx.fillStyle = settings.uiColor;
	drawRectangle(0, 0, ui.canvas.width, ui.canvas.height, settings.uiCornerRadius*settings.canvasResolution);

	buildColorPickers();
	buildButtons();

	ui.quad.material.map.needsUpdate = true;

	ui.quad.testCollision = testCollision;
	ui.quad.resetCollision = resetCollision;
	ui.quad.handleDrag = handleDrag;
	return ui;
}

let drawY = 0;
let margin = 20 * settings.canvasResolution;
let moved = new Vector2();

const colors = ['#FFF', '#000', '#FF0000', '#00FF00', '#0000FF', '#FF00FF', '#FFFF00', '#00FFFF']
const buildColorPickers = () => {

	const width = 0.9;
	const height = 0.45;
	const columns = 2;

	const colorWidth = (width / columns) * ui.canvas.width;
	const colorHeight = (height / (colors.length / columns)) * ui.canvas.height;

	let sx = ((1.0 - width) * ui.size[0] / 2) * ui.canvas.width;
	let sy = drawY + margin;

	colors.forEach((color, i) => {
		const xOffset = colorWidth * (i % columns);
		const yOffset = colorHeight * Math.floor(i / columns);
		ui.ctx.fillStyle = color;
		ui.ctx.strokeStyle = '#000000'

		const x = sx + xOffset;
		const y = sy + yOffset;

		ui.ctx.fillRect(x, y, colorWidth, colorHeight);

		registerElement(x, y, colorWidth, colorHeight, () => {
			gl.setClearColor(color);
		});
	});

	drawY += colorHeight * Math.floor(colors.length / columns) + margin;
}
const buildButtons = () => {
	buildButton('Spawn Region Fixer', () => {
		const offset = 1.0;
		const targetPosition = ui.quad.position.clone();
		targetPosition.y += targetPosition.y > -offset ? -offset : offset;
		regionManager.spawnRegion(targetPosition);
	});
	buildButton('Fix Regions', () => {
		regionManager.startFixRegions();
	});
}
const buildButton = (txt, cb) => {
	let width = 0.9
	let height = 0.2;
	const x = (1.0 - width) * ui.canvas.width/2;
	const y = drawY + margin;
	const buttonWidth = width * ui.canvas.width;
	const buttonHeight = height * ui.canvas.height;
	drawButton(txt, x, y, buttonWidth, buttonHeight, false);
	registerElement(x, y, buttonWidth, buttonHeight,
		cb,
		state => {
			drawButton(txt, x, y, buttonWidth, buttonHeight, state.down)
		}
	);
}

const drawButton = (txt, x, y, w, h, down) => {
	ui.ctx.fillStyle = !down ? settings.uiButtonColor : '#333';
	drawRectangle(x, y, w, h, settings.uiCornerRadius*settings.canvasResolution);
	const fontSize = settings.uiFontSize * settings.canvasResolution
	ui.ctx.font = `bold ${fontSize}px Arial`;
	ui.ctx.fillStyle = settings.uiTextColor;
	ui.ctx.textAlign = "center";
	ui.ctx.fillText(txt, x + w / 2, y + h / 2 + fontSize / 4);
	drawY += h + margin;
}
const drawRectangle = (x, y, w, h, r) => {
	if (w < 2 * r) r = w / 2;
	if (h < 2 * r) r = h / 2;
	ui.ctx.beginPath();
	ui.ctx.moveTo(x + r, y);
	ui.ctx.arcTo(x + w, y, x + w, y + h, r);
	ui.ctx.arcTo(x + w, y + h, x, y + h, r);
	ui.ctx.arcTo(x, y + h, x, y, r);
	ui.ctx.arcTo(x, y, x + w, y, r);
	ui.ctx.closePath();
	ui.ctx.fill();
}

const registerElement = (x, y, w, h, cb, redraw) => {
	elements.push({
		tl: {
			x,
			y
		},
		br: {
			x: x + w,
			y: y + h
		},
		callback: cb,
		down: false,
		redraw
	})
}

const testCollision = (uv, down) => {
	const x = uv.x * ui.canvas.width;
	const y = uv.y * ui.canvas.height;

	elements.forEach(el => {
		if (x > el.tl.x && x < el.br.x && y > el.tl.y && y < el.br.y) {
			if (down && el.redraw) {
				el.down = true;
				el.redraw(el);
				ui.quad.material.map.needsUpdate = true;
			} else if (!down && moved.length() < settings.uiMinDragDistance) {
				el.callback();
			}
		}
	})
	if (!down) moved.set(0, 0);
}
const resetCollision = () => {
	elements.forEach(el => {
		if (el.down && el.redraw) {
			el.down = false;
			el.redraw(el);
		}
	})
	ui.quad.material.map.needsUpdate = true;
}
const handleDrag = (x, y) => {
	ui.quad.position.x += x;
	ui.quad.position.y += y;
	moved.x += x;
	moved.y += y;
}
