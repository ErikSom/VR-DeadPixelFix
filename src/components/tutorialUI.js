import canvasQuad from './canvasQuad'
import settings from '../settings'
import state from './state'
import {
	Vector2
} from 'three';

export let ui = canvasQuad([2, 1.8]);
let elements = [];
let oldX = 0;

export const TUTORIAL = {
	START: {
		body: `
	1. Spot all the dead/lazy pixels\n
	    Press ENTER VR at the bottom\n
	    Switch colors to make the search easier\n
	2. Highlight broken pixels with Region Fixers\n
	    You can spawn multiple\n
	    You can drag the regions and the menu\n
	3. If all pixels are highlighted press Fix Regions\n
	    Photosensitive seizure warning\n
	    Take off the headset and cover the eye sensor\n
	    A sound will play once the process is done\n
	`,
		button:'Usage at own risk - Continue'
	},
	END: {
		body: `
	1. Check if all pixels are fixed - I hope so :)\n
	    All your selected regions are still highlighted\n
	2. Still seeing dead/lazy pixels?\n
	    Press Fix regions again\n
	    Second run will take 60 minutes\n
	    Turn up the volume for better energy transfer\n
	3. Still seeing dead/lazy pixels after second run?\n
	    Reach out to your vendor for more support\n
	`,
		button:'Continue'
	}
}

document.addEventListener(state.STOP_FIXING, ()=>{build(TUTORIAL.END)});

export const build = (textObject) => {
	drawY = 0;
	elements = [];

	ui.ctx.fillStyle = settings.uiColor;
	drawRectangle(0, 0, ui.canvas.width, ui.canvas.height, settings.uiCornerRadius * settings.canvasResolution);

	renderText(textObject.body);

	buildButton(textObject.button, hide);

	ui.quad.position.x = oldX;
	ui.quad.material.map.needsUpdate = true;

	ui.quad.testCollision = testCollision;
	ui.quad.resetCollision = resetCollision;
	ui.quad.handleDrag = handleDrag;
	return ui;
}

let drawY = 0;
let margin = 20 * settings.canvasResolution;
let moved = new Vector2();

const renderText = txt => {
	const fontSize = settings.uiFontSize * settings.canvasResolution
	ui.ctx.font = `bold ${fontSize}px Arial`;
	ui.ctx.textAlign = "left";
	drawY += margin + fontSize;
	const txtChunks = txt.split('\n');
	txtChunks.forEach(str => {
		ui.ctx.fillStyle = settings.uiTextTutorialColor;
		if (str.indexOf('.') > 0) {
			ui.ctx.fillStyle = settings.uiTextColor;
			drawY += fontSize / 2;
		}
		if (str.indexOf('seizure') > 0) ui.ctx.fillStyle = '#FF0000'
		ui.ctx.fillText(str, margin, drawY);
		drawY += fontSize / 2 + margin / 2;
	});
	drawY -= fontSize;
}
const buildButton = (txt, cb) => {
	let width = 0.6
	let height = 0.1;
	const x = (1.0 - width) * ui.canvas.width / 2;
	const y = drawY + margin;
	const buttonWidth = width * ui.canvas.width;
	const buttonHeight = 100 * settings.canvasResolution;
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
	drawRectangle(x, y, w, h, settings.uiCornerRadius * settings.canvasResolution);
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
export const hide = () => {
	oldX = ui.quad.position.x;
	ui.quad.position.x = 1000;
}
