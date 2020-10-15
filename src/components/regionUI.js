import canvasQuad from './canvasQuad'
import settings from '../settings'
import { Vector3 } from 'three';

export default class RegionUI{
	constructor(pos){
		this.moved = new Vector3();
		this.ui = canvasQuad([0.25, 0.25]);
		this.ui.quad.position.copy(pos);
		this.ui.quad.testCollision = this.testCollision.bind(this);
		this.ui.quad.handleDrag = this.handleDrag.bind(this);
		this.draw();
		this.down = false;
	}
	draw(){
		this.ui.ctx.clearRect(0, 0, this.ui.canvas.width, this.ui.canvas.height);
		this.ui.ctx.strokeStyle = settings.regionFixStrokeColor;
		this.ui.ctx.lineWidth = settings.regionFixLineWidth*settings.canvasResolution;
		this.ui.ctx.fillStyle = settings.regionFixFillColor;
		if(!this.down)this.ui.ctx.fillRect(0, 0, this.ui.canvas.width, this.ui.canvas.height);
		this.ui.ctx.strokeRect(0, 0, this.ui.canvas.width, this.ui.canvas.height);
		this.ui.quad.material.map.needsUpdate = true;
	}
	handleDrag(x, y){
		this.ui.quad.position.x += x;
		this.ui.quad.position.y += y;
	}
	testCollision(uv, down){
		this.down = down;
		this.draw();
	}
}
