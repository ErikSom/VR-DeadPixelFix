import {
	PerspectiveCamera, Scene, WebGLRenderer, EventDispatcher, Color, PlaneBufferGeometry, MeshBasicMaterial, Mesh, Vector3, sRGBEncoding
} from "three";

import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';
import state from './state'

export const camera = new PerspectiveCamera( 60, window.innerWidth / window.innerHeight, 0.1, 1000 );
export const scene = new Scene();
export const gl = new WebGLRenderer( { antialias: true } );
export const events = new EventDispatcher();
export let vrButton = null;

export const init = ()=>{
    scene.add(camera);

    gl.setPixelRatio( window.devicePixelRatio );
    gl.setSize( window.innerWidth, window.innerHeight );
    gl.outputEncoding = sRGBEncoding;
    gl.xr.enabled = true;
    gl.setClearColor(new Color('#000'))
    gl.xr.setReferenceSpaceType( 'local' );

    vrButton = VRButton.createButton( gl );
    document.body.appendChild( gl.domElement );
    document.body.appendChild(vrButton);

	document.addEventListener(state.GOVR, ()=>{vrButton.style.display='none'});
	document.addEventListener(state.START_FIXING, ()=>{vrButton.style.display='none'});
	document.addEventListener(state.STOP_FIXING, ()=>{vrButton.style.display='block'});

    window.addEventListener( 'resize', onWindowResize, false );

    gl.setAnimationLoop( updater );
}

let oldTime = 0;
const updater = time =>{
    render();

    const delta = (time-oldTime)/1000;
    oldTime = time;
    events.dispatchEvent({ type: 'tick', delta });
}
const render = ()=>{
    gl.render( scene, camera );
}
const onWindowResize = () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    gl.setSize( window.innerWidth, window.innerHeight );
}
export const spawnPlane = (target, _props)=>{
    const props = Object.assign({
        geometry:[20, 20, 32],
        material:{color:0xffffff, transparent:true},
        position: [0, 0, 0],
        rotation: [0, 0, 0],
    }, (_props || {}))

    const geometry = new PlaneBufferGeometry( ...props.geometry );
    const material = new MeshBasicMaterial( props.material);
    const plane = new Mesh( geometry, material );
    plane.position.copy(new Vector3(...props.position));
    plane.rotation.setFromVector3(new Vector3(...props.rotation));
    target.add( plane );
    return plane;
}
