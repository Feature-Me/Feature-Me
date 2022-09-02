import { Howl } from "howler";
import * as THREE from "three";
import { GLTF } from "three/examples/jsm/loaders/GLTFLoader";
import scrollSpeedToScrollTime from "Utils/scrollSpeedToScrollTime/scrollSpeedToScrollTime";
import easing from "../../Utils/easing/easing";

import { chartBrightNote, chartDamageTapNote, chartFlickNote, chartHoldNote, chartNote, chartSeedNote, chartTapNote } from "../parseChart/chartSample";

class note {
    type:chartNote["type"];
    time: number;
    script: Array<string>;
    note: THREE.Object3D;
    transitionEase: ((pos: number) => number) | string;
    audio: Howl;

    active: boolean = false;
    judged: boolean = false;

    scrollSpeed: number = 10;
    scrollTime: number = scrollSpeedToScrollTime(this.scrollSpeed);

    constructor(note: chartNote) {
        this.type = note.type;
        this.time = note.time;
        this.script = note.script || [];
        this.note = new THREE.Object3D();
        this.transitionEase = note.transitionEase || easing.linear;
        this.audio = new Howl({
            src: ["data:audio/mp3;base64,"],
            loop: false
        });
    }
    judge(judgeTime: number): { judge: judgeText, accuracy:number}| undefined{
        if(this.judged) return;
        this.judged = true;
        let judgeText:judgeText;
        if (Math.abs(judgeTime - this.time) > 150) judgeText = "lost"
        else if(Math.abs(judgeTime - this.time) < 40) judgeText = "stunning";
        else if(Math.abs(judgeTime - this.time) < 75) judgeText = "glossy";
        else judgeText = "moderate";

        if (judgeText != "lost") this.audio.play();

        return {
            judge: judgeText,
            accuracy: judgeTime - this.time
        }
    }
    setBehavior(model: GLTF) {
        const behavior = model.scene.clone();
        this.note = behavior;
        this.note.position.set(0, 0.1, 100);
    }
    setAudio(audioUrl: string,volume:number) {
        this.audio = new Howl({
            src: [audioUrl]
        });
    }
    setScrollSpeed(speed: number) {
        this.scrollSpeed = speed;
        this.scrollTime = scrollSpeedToScrollTime(this.scrollSpeed);
    }
    setActive(active: boolean) {
        this.active = active;
    }
    updatePosition(gameTime: number) {
        //const z = -((this.time - gameTime)/this.scrollTime) * 87.5;
        const progress = (gameTime - this.time) / this.scrollTime;
        const z = this.getPositionFromEasing(progress) * 87.5;
        this.note.position.z = z;
    }
    getPositionFromEasing(progress: number) {
        if(typeof this.transitionEase === "function") return this.transitionEase(progress);
        else if(this.transitionEase in easing) return easing[this.transitionEase as keyof typeof easing](progress);
        else return easing.linear(progress);
    }
}

class tapNote extends note {
    lane: 1 | 2 | 3 | 4;
    constructor(note: chartTapNote) {
        super(note);
        this.lane = note.lane;
    }
    setBehavior(model: GLTF): void {
        super.setBehavior(model);
        const x = 4 * this.lane - 10;
        this.note.position.x = x;
        this.note.name = "tap";
    }
}

class damageTapNote extends note {
    lane: 1 | 2 | 3 | 4;
    constructor(note: chartDamageTapNote) {
        super(note);
        this.lane = note.lane;
    }
    setBehavior(model: GLTF): void {
        super.setBehavior(model);
        const x = 4 * this.lane - 6;
        this.note.position.x = x;
        this.note.name = "damageTap";
    }
}

class holdNote extends note {
    lane: 1 | 2 | 3 | 4;
    duration: number;
    chainCount: number = 0;
    constructor(note: chartHoldNote) {
        super(note);
        this.lane = note.lane;
        this.duration = note.duration;
    }
    setBehavior(model: GLTF): void {
        super.setBehavior(model);
        const x = 4 * this.lane - 6;
        this.note.position.x = x;
        
        const fromZ = -(0/this.scrollTime) * 87.5;
        const toZ = -(this.duration/this.scrollTime) * 87.5;
        this.note.position.z = (fromZ - toZ) /8;
        this.note.name = "hold";
    }
    getChain(bpm:number): number{
        this.chainCount = Math.floor(this.duration / (60 / bpm)*2);
        return this.chainCount;
    }
}

class brightNote extends note {
    constructor(note: chartBrightNote) {
        super(note);
    }
    setBehavior(model: GLTF): void {
        super.setBehavior(model);
        this.note.name = "bright";
    }
     judge(judgeTime: number){
        if(this.judged) return;
        this.judged = true;
        let judgeText:judgeText;
        if(Math.abs(judgeTime - this.time) > 150) judgeText = "lost";
        else judgeText = "stunning";
        if (judgeText != "lost") this.audio.play();
        return {
            judge: judgeText,
            accuracy: judgeTime - this.time
        }
    }
}

class seedNote extends note {
    lane: "left" | "right";
    constructor(note: chartSeedNote) {
        super(note);
        this.lane = note.lane;
    }
    setBehavior(model: GLTF): void {
        super.setBehavior(model);
        const x = this.lane === "left" ? -9 : 9;
        this.note.position.x = x;
        this.note.name = "seed";
    }
    judge(judgeTime: number) {
        if(this.judged) return;
        this.judged = true;
        console.log(judgeTime,this.time);
        
        if(judgeTime - this.time > 100)
            return{
                judge:"lost" as judgeText,
                accuracy:0
        }
        this.audio.play();
        return {
            judge: "stunning" as judgeText,
            accuracy: 0
        }
    }
    updatePosition(gameTime: number): void {
        super.updatePosition(gameTime);
    }
}

class flickNote extends note {
    lane: "left" | "center" |"right";
    direction: "left" | "right";
    constructor(note: chartFlickNote) {
        super(note);
        this.lane = note.lane;
        this.direction = note.direction;
    }
    setBehavior(model: GLTF): void {
        super.setBehavior(model);
        const x = this.lane === "left" ? -4 : this.lane === "right" ? 4 : 0;
        this.note.position.x = x;

        if(this.direction === "right") {
            this.note.rotation.y = Math.PI;
        }
        this.note.name = "flick";
    }
}

export {
    note,
    tapNote,
    damageTapNote,
    holdNote,
    brightNote,
    seedNote,
    flickNote
}