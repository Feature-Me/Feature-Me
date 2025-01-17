import React from "react";
import { useRecoilState, useRecoilValue, useSetRecoilState } from "recoil";
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass";
import { GLTF, GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { TextGeometry } from "three/examples/jsm/geometries/TextGeometry";
import { motion, useAnimation } from "framer-motion";
import { Howl, Howler } from "howler";

import { SSAARenderPass } from "three/examples/jsm/postprocessing/SSAARenderPass"
import { SMAAPass } from "three/examples/jsm/postprocessing/SMAAPass";
import { TAARenderPass } from "three/examples/jsm/postprocessing/TAARenderPass";

import style from "./musicGame3d.scss";

import MusicGameUI from "../UI/musicGameUI";

import loadBehavior from "Utils/Storage/resourcesLoader/loadBehavior";
import loadSoundEffect from "Utils/Storage/resourcesLoader/loadSoundEffect";
import arrayBufferToBase64 from "Utils/ArrayBufferToBase64/ArrayBufferToBase64";
import parseChart from "Features/play/parseChart/parseChart";
import sleep from "Utils/sleep/sleep";

import renderingStatus from "Utils/getRenderingStatus/renderingStatus";

import gameConfigState from "State/gameConfig/gameConfig";
import musicSelectorState from "State/play/musicSelector/musicSelectorState";

import * as musicGame from "State/play/game/musicGame/musicGameState"

import version from "Config/versions.json";
import { chartType } from "Features/play/parseChart/chartSample";
import acceptBehavior from "Features/play/acceptBehavior/acceptBehavior";
import { brightNote, holdNote, note, seedNote, tapNote } from "Features/play/class/noteClass/notes";
import { musicGameVariablesType } from "Types/play/game/gameVariables";
import { match } from "ts-pattern";
import easings from "Utils/easing/easing";
import useSeneChangeNavigation from "Hooks/scenechange/useSceneChangeNavigation";
import { cloneDeep } from "lodash";
import loadFont from "Utils/Storage/resourcesLoader/loadFont";
import { gameData, gameProps } from "Types/play/game/gameProps";
import { fontTable } from "Types/resources/fontResources";
import { Font } from "three/examples/jsm/loaders/FontLoader";
import { Vector3 } from "three";


const MusicGame3D: React.FC<gameProps> = (props) => {

    const scenechange = useSeneChangeNavigation();
    const selectedMusic = useRecoilValue(musicSelectorState);
    const gameConfig = useRecoilValue(gameConfigState);

    const setMusicGameValue = useSetRecoilState(musicGame.musicGameValueState);
    const setMusicGameNotesJudge = useSetRecoilState(musicGame.musicGameNotesJudgeState)
    const setMusicGamePrediction = useSetRecoilState(musicGame.musicGamePredictionState);
    const setMusicGameUIState = useSetRecoilState(musicGame.musicGameUIState);
    const musicGameMode = useRecoilValue(musicGame.musicGameModeState);
    const setMusicGamePause = useSetRecoilState(musicGame.musicGamePauseState);
    const setMusicGameTime = useSetRecoilState(musicGame.musicGameTimeState)

    const musicgameCanvasRef = React.useRef<HTMLDivElement>(null);

    const musicData = selectedMusic.selectedData as MusicAssetContents;
    //if rawChart or rawMusic is undefined, play error music
    //let behavior: { model: behaviorAssetContents; sound: soundEffectAssetContents; font: behaviorAssetContents; };
    //const activeRange = musicGame_.mode == "auto"? 0: 1000;
    //const activeRange = 0;
    const gameOptions = {
        alpha: true,
    }
    const gameRenderer = new THREE.WebGLRenderer(gameOptions);
    const gameScene = new THREE.Scene();
    const notesContainer = new THREE.Group();
    const judgeTextContainer = React.useRef(new THREE.Group());
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 87.5)
    const composer = new EffectComposer(gameRenderer);
    gameScene.name = "musicGameScene";
    notesContainer.name = "notesContainer";
    judgeTextContainer.current.name = "judgeTextContainer";
    let character = React.useRef(new THREE.Object3D());
    let gameRenderInterval: NodeJS.Timer;

    let musicGameVariables = React.useRef<musicGameVariablesType>({
        activeRange: 250,
        activeNotes: [],
        delay: 0,
        inputs: {
            position: "left",
            lanes: [false, false, false, false]
        },
        time: {
            initialVoidTime: 0,
            startTime: 0,
            elapsedTime: 0,
            gameTime: 0,
            judgeTime: 0,
            totalTime: 0
        }
    })

    let musicUri = `data:${props.data.music?.mime || "audio/mp3"};base64,${arrayBufferToBase64(props.data.music?.data || new ArrayBuffer(0))}`;
    let musicDuration: number = 0;
    let musicAudio = React.useRef(new Howl({
        src: musicUri,
        volume: (gameConfig.audio.masterVolume * gameConfig.audio.musicVolume) || 1,
    }));
    musicAudio.current.stereo(gameConfig.audio.audioStereo)

    let ResultNavigationTimeout: NodeJS.Timeout;

    //judge text table
    const judgeTable: fontTable = [
        { name: "stunning", label: "Stunning", color: "#e5e537" },
        { name: "glossy", label: "Glossy", color: "#1feaf4" },
        { name: "moderate", label: "Moderate", color: "#3dbf2a" },
        { name: "lost", label: "Lost", color: "#aaaaaa" }
    ]
    const timeTable: fontTable = [
        { name: "future", label: "Future", color: "#1f5ff4" },
        { name: "past", label: "Past", color: "#f4751f" }
    ]


    //listen events
    React.useEffect(() => {
        window.addEventListener("keydown", keyInput);
        window.addEventListener("keyup", keyUp);
        window.addEventListener("resize", resizeCanvas);
        return () => {
            clearTimeout(ResultNavigationTimeout);
            clearInterval(gameRenderInterval);
            gameRenderer.dispose();
            window.removeEventListener("keydown", keyInput);
            window.removeEventListener("resize", resizeCanvas);
            musicAudio.current.stop();
            musicAudio.current.unload();
        }
    }, []);

    React.useEffect(() => {
        if (!props.ready) return;
        preparingGame();

    }, [props])

    //when resized window, resize canvas to fit window size
    function resizeCanvas() {
        console.log("resize", window.innerWidth, window.innerHeight);
        gameRenderer.setSize(window.innerWidth, window.innerHeight);
        composer.setSize(window.innerWidth, window.innerHeight);
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
    }

    // play sound
    async function preparingGame() {
        if (!props.ready) return;


        await initRenderer();

        const totalTime = musicData.metadata.time + (((60 / props.data.chart!.metadata.initialBpm) * 1000) * 4) + 1000;
        musicGameVariables.current.time.totalTime = totalTime;
        setMusicGameTime(time => {
            return {
                ...time,
                totalTime: totalTime,
                startedTime: performance.now()
            }
        })

        musicGameVariables.current.time.initialVoidTime = (((60 / props.data.chart!.metadata.initialBpm) * 1000) * 4)
        musicGameVariables.current.time.startTime = performance.now() + (((60 / props.data.chart!.metadata.initialBpm) * 1000) * 4) + 3500 + props.data.chart!.metadata.offset;
        //musicGameVariables.ready = true;
        ResultNavigationTimeout = setTimeout(() => {
            scenechange("../result");
        }, totalTime + musicGameVariables.current.time.initialVoidTime + 2000);

        await sleep(3500);
        const sound = props.data.behavior.sound?.sound.assist;
        const soundUri = `data:${sound?.mime || "audio/mp3"};base64,${arrayBufferToBase64(sound?.data || new ArrayBuffer(0))}`;
        const audio = new Howl({
            src: soundUri,
            volume: gameConfig.audio.effectVolume || 1,
        });
        for (let i = 0; i < 4; i++) {
            audio.play();
            await sleep((60 / props.data.chart!.metadata.initialBpm) * 1000);
        }
        audio.stop();
        audio.unload();
        musicAudio.current.play();
        musicGameVariables.current.delay = performance.now() - musicGameVariables.current.time.startTime
    }


    //initialize game scene
    async function initRenderer() {
        //light and game objects
        const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
        const directionalLight = new THREE.DirectionalLight(0xffffff, 7);

        //renderer settings 
        gameRenderer.outputEncoding = THREE.sRGBEncoding;
        gameRenderer.physicallyCorrectLights = true;
        gameRenderer.toneMapping = THREE.ACESFilmicToneMapping;
        gameRenderer.toneMappingExposure = 0.25;
        gameRenderer.setSize(window.innerWidth, window.innerHeight);
        gameRenderer.setPixelRatio(gameConfig.graphics.musicgame.resolution || 1);
        musicgameCanvasRef.current?.appendChild(gameRenderer.domElement);


        directionalLight.position.set(0, 10, 10);
        directionalLight.lookAt(0, 0, -10);

        camera.position.set(0, 8, 5);
        camera.rotation.set(THREE.MathUtils.degToRad(-38), 0, 0);

        gameScene.add(ambientLight, directionalLight, notesContainer, judgeTextContainer.current);

        //post process
        const renderPass = new RenderPass(gameScene, camera);
        composer.addPass(renderPass);
        let AAPass: SSAARenderPass | SMAAPass | undefined = undefined;
        if (gameConfig.graphics.musicgame.postProcessing.enabled) {
            if (gameConfig.graphics.musicgame.postProcessing.antialias == "SSAA") {
                AAPass = new SSAARenderPass(gameScene, camera);
                AAPass.sampleLevel = gameConfig.graphics.musicgame.postProcessing.AALevel;
            }
            if (gameConfig.graphics.musicgame.postProcessing.antialias == "SMAA") AAPass = new SMAAPass(window.innerWidth, window.innerHeight);
            if (gameConfig.graphics.musicgame.postProcessing.antialias == "TAA") {
                AAPass = new TAARenderPass(gameScene, camera, "black", 1)
                AAPass.sampleLevel = gameConfig.graphics.musicgame.postProcessing.AALevel;
            }
            if (AAPass) composer.addPass(AAPass)
        }

        await setGround();
        await setCharacter();
        gameRenderInterval = setInterval(render, (gameConfig.graphics.musicgame.fps || 120) / 1000)
    }

    //render ground
    async function setGround() {
        const groundGltf = props.data.behavior.model?.models.ground;
        const gltf = await new GLTFLoader().loadFromArrayBufferAsync(groundGltf || new ArrayBuffer(0))
        const model = gltf.scene;
        model.position.set(0, 0, 0);
        model.receiveShadow = true;
        gameScene.add(model)
    }

    //redner character
    async function setCharacter() {
        const characterGltf = props.data.behavior.model?.models.character;
        const gltf = await new GLTFLoader().loadFromArrayBufferAsync(characterGltf || new ArrayBuffer(0));
        character.current = gltf.scene;
        character.current.position.set(-9, 0, 0);
        character.current.rotation.set(0, 0, 0)
        character.current.castShadow = true;
        gameScene.add(character.current)
    }

    //character move to left or right
    async function moveCharacter(position: ("left" | "right")) {
        const currentPos = character.current.position.x;
        const newPos = position == "left" ? -9 : 9;
        if (currentPos == newPos) return;
        const moveDistance = -(currentPos - newPos);
        for (let i = 0; i < 100; i++) {
            const pos = easings.easeOutExpo(i / 100) * (moveDistance) + currentPos;
            character.current.position.x = pos;
            await sleep(5);
        }

    }
    //render to canvas
    function render() {
        composer.render();
        updateGame();
    }

    function updateChainText(chain: number) {
        const oldObj = gameScene.children.find(c => c.name == "chainText")
        if (oldObj) gameScene.remove(oldObj);

        const font = new Font(props.data.behavior.font.data)
        const chainTextGeometry = new THREE.ShapeGeometry(font.generateShapes(chain.toString(), 1));
        const chainTextMaterial = new THREE.MeshStandardMaterial({ color: "#a0a0a0" });
        const chainTextMesh = new THREE.Mesh(chainTextGeometry, chainTextMaterial);

        chainTextGeometry.computeBoundingBox();
        if (chainTextGeometry.boundingBox) {
            const xMid = - 0.5 * (chainTextGeometry.boundingBox.max.x - chainTextGeometry.boundingBox.min.x);
            chainTextGeometry.translate(xMid, 0, 0);
        }

        chainTextMesh.position.set(0, 0.25, 12.5);
        chainTextMesh.rotation.set(0, 0, 0);
        gameScene.add(chainTextMesh)

    }

    //update notes position
    function updateGame() {
        if (!props.ready) return;
        const activeRange = musicGameVariables.current.activeRange
        const elapsedTime = performance.now() - musicGameVariables.current.time.startTime;
        const gameTime = elapsedTime - /* musicGameVariables.delay - */ gameConfig.gameplay.timing.offset;
        const judgeTime = gameTime - gameConfig.gameplay.timing.judge;
        musicGameVariables.current.time.elapsedTime = elapsedTime;
        musicGameVariables.current.time.gameTime = gameTime;
        musicGameVariables.current.time.judgeTime = judgeTime;

        for (const note of musicGameVariables.current.activeNotes) {
            if (note.judged) {
                note.active = false;
                notesContainer.remove(note.note);
                const index = musicGameVariables.current.activeNotes.findIndex(n => n == note);
                musicGameVariables.current.activeNotes.splice(index, 1);
            }
            else if (note instanceof seedNote && Math.abs(note.time - gameTime) < 25 && note.lane == musicGameVariables.current.inputs.position) managementJudge(note.judge(gameTime));
            else if (note.time + activeRange < judgeTime) managementJudge(note.judge(judgeTime))
            note.updatePosition(gameTime)
        }
        for (const note of props.data.chart!.notes) {
            if (note.active) continue;
            if (note.time - Math.abs(gameTime) < note.scrollTime) {
                note.active = true;
                notesContainer.add(note.note);
                musicGameVariables.current.activeNotes.push(note);
            }
        }
    }

    //get key event and dispatch action
    function keyInput(key: KeyboardEvent) {
        if (!gameConfig.gameplay.key.includes(key.code)) return;

        const keyPos = gameConfig.gameplay.key.findIndex(str => str == key.code) as 0 | 1 | 2 | 3 | 4 | 5 | 6;
        if (keyPos < 4) musicGameVariables.current.inputs.lanes[keyPos as 0 | 1 | 2 | 3] = true;
        keyAction(keyPos);
    }
    function keyAction(keyPos: 0 | 1 | 2 | 3 | 4 | 5 | 6) {
        return match(keyPos)
            .with(0, () => { judgeKeyPush(0) })
            .with(1, () => { judgeKeyPush(1) })
            .with(2, () => { judgeKeyPush(2) })
            .with(3, () => { judgeKeyPush(3) })
            .with(4, () => { judgeKeyPush(4) })
            .with(5, () => { musicGameVariables.current.inputs.position = "left"; moveCharacter("left") })
            .with(6, () => { musicGameVariables.current.inputs.position = "right"; moveCharacter("right") })
            .exhaustive();
    }

    function keyUp(key: KeyboardEvent) {
        if (!gameConfig.gameplay.key.includes(key.code)) return;
        const keyPos = gameConfig.gameplay.key.findIndex(str => str == key.code) as 0 | 1 | 2 | 3 | 4 | 5 | 6;
        if (keyPos < 4) musicGameVariables.current.inputs.lanes[keyPos as 0 | 1 | 2 | 3] = false;
    }

    //find note and judge.
    function judgeKeyPush(pos: 0 | 1 | 2 | 3 | 4) {
        const judgeTime = musicGameVariables.current.time.judgeTime;
        const activeRange = musicGameVariables.current.activeRange;

        if (pos < 4) {
            //find tap note and judge
            const note = musicGameVariables.current.activeNotes.find(note => note instanceof tapNote && note.lane == pos + 1 && Math.abs(note.time - judgeTime) < activeRange);

            if (note) managementJudge(note.judge(judgeTime));
        } else if (pos == 4) {
            //bright note
            const note = musicGameVariables.current.activeNotes.find(note => note instanceof brightNote && Math.abs(note.time - judgeTime) < activeRange);
            if (note) managementJudge(note.judge(judgeTime));
        }
    }

    function keyTouch(posX: number) {

    }

    //set score and some info
    function managementJudge(judge: { judge: judgeText, accuracy: number, note: THREE.Object3D } | undefined) {
        if (!judge) return;
        let score = props.data.chart!.metadata.scorePerNote;
        if (judge.judge == "glossy") score *= 0.75;
        else if (judge.judge == "moderate") score *= 0.5;
        else if (judge.judge == "lost") score = 0;

        //update score and some values
        setMusicGameNotesJudge(noteJudge => {
            const accuracy = ((noteJudge.accuracy * noteJudge.notesCount.current) + judge.accuracy) / (noteJudge.notesCount.current + 1)
            const judgeType = cloneDeep(noteJudge.judge);
            judgeType[judge.judge] = judgeType[judge.judge] + 1
            return {
                ...noteJudge,
                notesCount: {
                    ...noteJudge.notesCount,
                    current: noteJudge.notesCount.current + 1
                },
                accuracy: accuracy,
                judge: judgeType,
                timing: {
                    ...noteJudge.timing,
                    future: noteJudge.timing.future + (judge.accuracy < 0 ? 1 : 0),
                    past: noteJudge.timing.past + (judge.accuracy > 0 ? 1 : 0)
                }
            }
        })
        setMusicGameValue(value => {
            updateChainText(judge.judge == "lost" ? 0 : value.chain + 1,);
            return {
                ...value,
                score: value.score + score,
                chain: judge.judge == "lost" ? 0 : value.chain + 1,
                maxChain: Math.max((judge.judge == "lost" ? 0 : value.chain + 1), value.maxChain)
            }
        })
        updateJudgeText(judge.judge, judge.accuracy, judge.note.position.x)
    }

    function updateJudgeText(judgeText: string, accuracy: number, posX: number) {
        if (!props.data.behavior.font || !gameConfig.gameplay.judgeText.show) return;

        const tableData = judgeTable.find(t => t.name == judgeText)

        if (!tableData) return;

        //create judge text with shape geometry
        new Promise<void>(async (resolve) => {
            const font = new Font(props.data.behavior.font.data)
            const judgeTextGeometry = new THREE.ShapeGeometry(font.generateShapes(tableData.label, 0.3));
            const judgeTextMaterial = new THREE.MeshStandardMaterial({ color: tableData.color, transparent: true, opacity: 1 });
            const judgeTextMesh = new THREE.Mesh(judgeTextGeometry, judgeTextMaterial);

            judgeTextMesh.position.set(posX, 0.25, gameConfig.gameplay.judgeText.position);
            judgeTextMesh.rotation.set(THREE.MathUtils.degToRad(gameConfig.gameplay.judgeText.direction), 0, 0)

            if (Math.abs(accuracy) > 24) {
                const label = accuracy < 0 ? "future" : "past";
                const FPData = timeTable.find(t => t.name == label);
                if (!FPData) return;
                const FPTextGeometry = new THREE.ShapeGeometry(font.generateShapes(FPData.label, 0.25));
                const FPTextMaterial = new THREE.MeshStandardMaterial({ color: FPData.color, transparent: true, opacity: 1 });
                const FPTextMesh = new THREE.Mesh(FPTextGeometry, FPTextMaterial);
                FPTextMesh.position.set(0, 0.3, -0.2);
                FPTextGeometry.computeBoundingBox();
                if (FPTextGeometry.boundingBox) {
                    const xMid = - 0.5 * (FPTextGeometry.boundingBox.max.x - FPTextGeometry.boundingBox.min.x);
                    FPTextGeometry.translate(xMid, 0, 0);
                }
                judgeTextMesh.add(FPTextMesh);
            }

            // translate -50% of itself
            judgeTextGeometry.computeBoundingBox();
            if (judgeTextGeometry.boundingBox) {
                const xMid = - 0.5 * (judgeTextGeometry.boundingBox.max.x - judgeTextGeometry.boundingBox.min.x);
                judgeTextGeometry.translate(xMid, 0, 0);
            }
            //add and animation
            judgeTextContainer.current.add(judgeTextMesh);
            for (let i = 0; i < 25; i++) {
                judgeTextMesh.position.setY(judgeTextMesh.position.y + 0.05);
                judgeTextMaterial.opacity -= 0.04
                await sleep(500 / 25);
            }
            //after animation, text will remove
            judgeTextContainer.current.remove(judgeTextMesh);
            resolve();
        })
    }

    return (
        <div className={style.musicgameCanvas} ref={musicgameCanvasRef}></div>
    )
}

export default MusicGame3D;