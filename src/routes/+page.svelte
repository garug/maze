<script lang="ts">
    import { onMount } from "svelte";
    import { writable } from "svelte/store";
    import lodash from "lodash";
    import TreeNode from "../components/TreeNode";

    interface CanvasObject {
        x: number;
        y: number;
    }

    type direction = "norte" | "leste" | "sul" | "oeste";

    type AllowedKey = typeof allowedKeys[number];

    const allowedKeys = [
        "ArrowUp",
        "ArrowRight",
        "ArrowDown",
        "ArrowLeft",
    ] as const;

    const SQUARE_SIZE = 8;

    const directions = {
        norte: {
            x: 0,
            y: -1,
        },
        leste: {
            x: 1,
            y: 0,
        },
        sul: {
            x: 0,
            y: 1,
        },
        oeste: {
            x: -1,
            y: 0,
        },
    };

    const commands = {
        ArrowUp: {
            getLine: getLineUp,
        },
        ArrowRight: {
            getLine: getLineRight,
        },
        ArrowDown: {
            getLine: getLineDown,
        },
        ArrowLeft: {
            getLine: getLineLeft,
        },
    };

    let size = 100;

    let color = "#0098fe";

    let canvas: HTMLCanvasElement;

    let context: CanvasRenderingContext2D;

    let frame = 0;

    let time = 0;

    let width = writable(0);

    let height = writable(0);

    let player = {
        x: 0,
        y: 0,
    };

    function generateEdge(s = size) {
        return Array.from({ length: s }).map((_, i) => i);
    }

    function generateSquare(x: number, y: number) {
        return {
            x,
            y,
            color: "white",
            node: new TreeNode(`${x}${y}`),
        };
    }

    function generateLine(x: number, y: number) {
        const vertical = {
            active: true,
            start: {
                x,
                y,
            },
            finish: {
                x,
                y: y + 1,
            },
        };

        const horizontal = {
            active: true,
            start: {
                x,
                y,
            },
            finish: {
                x: x + 1,
                y,
            },
        };

        const returned = [];

        x !== size && returned.push(horizontal);
        y !== size && returned.push(vertical);

        return returned;
    }

    function getLineUp(e: CanvasObject) {
        return lines.get(`${e.x}.${e.y}.${e.x + 1}.${e.y}`);
    }

    function getLineRight(e: CanvasObject) {
        return lines.get(`${e.x + 1}.${e.y}.${e.x + 1}.${e.y + 1}`);
    }

    function getLineDown(e: CanvasObject) {
        return lines.get(`${e.x}.${e.y + 1}.${e.x + 1}.${e.y + 1}`);
    }

    function getLineLeft(e: CanvasObject) {
        return lines.get(`${e.x}.${e.y}.${e.x}.${e.y + 1}`);
    }

    function getLines(e: CanvasObject) {
        return [getLineUp(e), getLineRight(e), getLineDown(e), getLineLeft(e)];
    }

    function getLineBetween(e: CanvasObject, e2: CanvasObject) {
        const equalX = e.x === e2.x;
        const equalY = e.y === e2.y;

        if (!equalX && !equalY) {
            console.warn("Tried get line between two impossible objects");
            return;
        }

        if (equalX && equalY) return;

        if (e.x - e2.x === 1 || e.y - e2.y === 1) {
            return lines.get(`${e.x}.${e.y}.${e2.x + 1}.${e2.y + 1}`);
        } else if (e.x - e2.x === -1 || e.y - e2.y === -1) {
            return lines.get(`${e2.x}.${e2.y}.${e.x + 1}.${e.y + 1}`);
        }
    }

    function handleResize() {
        width.set(window.innerWidth);
        height.set(window.innerHeight);
    }

    function handleKeydown(e: KeyboardEvent) {
        const key = allowedKeys.includes(e.key as any) && (e.key as AllowedKey);

        if (!key) return;

        const line = commands[key].getLine(player);

        if (line.active) return;

        if (key === "ArrowUp") {
            player.y--;
        }

        if (key === "ArrowRight") {
            player.x++;
        }

        if (key === "ArrowDown") {
            player.y++;
        }

        if (key === "ArrowLeft") {
            player.x--;
        }
    }

    function renderLines() {
        [...lines]
            .filter(([_, value]) => value.active)
            .map(([_, value]) => value)
            .forEach((line) => {
                const startX = line.start.x * SQUARE_SIZE;
                const startY = line.start.y * SQUARE_SIZE;
                const finishX = line.finish.x * SQUARE_SIZE;
                const finishY = line.finish.y * SQUARE_SIZE;

                context.beginPath();
                context.moveTo(startX, startY);
                context.lineTo(finishX, finishY);
                context.stroke();
            });
    }

    function renderSquares() {
        grid.forEach((square, i) => {
            context.beginPath();
            context.fillStyle = square === finishSquare ? "red" : square.color;
            context.rect(
                square.x * SQUARE_SIZE,
                square.y * SQUARE_SIZE,
                SQUARE_SIZE,
                SQUARE_SIZE
            );
            context.fill();
        });
    }

    function renderPlayer() {
        const squareWidth = SQUARE_SIZE / 3.5;
        const halfSquare = SQUARE_SIZE / 2;

        context.beginPath();
        context.arc(
            halfSquare + player.x * SQUARE_SIZE,
            halfSquare + player.y * SQUARE_SIZE,
            squareWidth,
            0,
            2 * Math.PI,
            false
        );

        context.fillStyle = "white";
        context.fill();
    }

    function render(dt: any) {
        context.clearRect(0, 0, canvas.width, canvas.height);

        renderSquares();
        renderLines();
        renderPlayer();

        // TODO remover, renderizando labels pra apoio
        grid.forEach((e) => {
            context.fillStyle = "white";
            // context.fillText(
            //     `${e.x}${e.y}`,
            //     e.x * SQUARE_SIZE + 8.5,
            //     e.y * SQUARE_SIZE + 14.5
            // );
            // context.fillText(
            //     e.node.root.toString(),
            //     e.x * SQUARE_SIZE + 8.5,
            //     e.y * SQUARE_SIZE + 22.5
            // );
        });
    }

    function createLoop(fn: (elapsed: any, dt: any) => void) {
        let elapsed = 0;
        let lastTime = performance.now();
        (function loop() {
            frame = requestAnimationFrame(loop);
            const beginTime = performance.now();
            const dt = (beginTime - lastTime) / 1000;
            lastTime = beginTime;
            elapsed += dt;
            fn(elapsed, dt);
        })();
        return () => {
            cancelAnimationFrame(frame);
        };
    }

    onMount(() => {
        handleResize();
        const ctx = canvas.getContext("2d");
        ctx && (context = ctx);

        return createLoop((elapsed, dt) => {
            time = elapsed;
            render(dt);
        });
    });

    $: canvasSize = size * SQUARE_SIZE;

    $: grid = generateEdge()
        .map((x) => generateEdge().map((y) => generateSquare(x, y)))
        .flatMap((e) => e);

    $: lines = generateEdge(size + 1)
        .map((x) => generateEdge(size + 1).map((y) => generateLine(x, y)))
        .flatMap((e) => e.flatMap((e2) => e2))
        .reduce((acc, e) => {
            acc.set(`${e.start.x}.${e.start.y}.${e.finish.x}.${e.finish.y}`, e);
            return acc;
        }, new Map());

    $: edges = grid
        .map((e) => [
            { ...e, direction: (e.x === 0 ? "leste" : "oeste") as direction },
            { ...e, direction: (e.y === 0 ? "sul" : "norte") as direction },
        ])
        .flatMap((e) => e);

    $: mapGrid = grid.reduce((acc, e) => {
        acc.set(`${e.x}.${e.y}`, e);
        return acc;
    }, new Map());

    $: for (const e of lodash.shuffle(edges)) {
        const { x, y } = directions[e.direction];

        const neighborKey = `${e.x + x}.${e.y + y}`;

        const realKey = `${e.x}.${e.y}`;

        const neighbor = mapGrid.get(neighborKey);

        const real = mapGrid.get(realKey);

        if (real.node.root === neighbor.node.root) continue;

        neighbor.node.root = real.node;

        const line = getLineBetween(e, neighbor);

        if (line) {
            line.active = false;
        } else {
            console.warn("Line not found, something probably wrong with maze");
            console.info(real, realKey, neighbor, neighborKey);
        }
    }

    $: halfSize = size / 2;

    $: finishSquare = lodash.shuffle(
        grid.filter((square) => {
            const activeLines = getLines(square).filter((line) => line.active);

            const isClosed = activeLines.length === 3;

            const farFromStart = square.x >= halfSize || square.y >= halfSize;

            return isClosed && farFromStart;
        })
    )[0];

    $: (function () {
        const square = mapGrid.get(`${player.x}.${player.y}`);
        square.color = color;
    })();
</script>

<div class="container">
    <canvas
        bind:this={canvas}
        class="canvas"
        width={canvasSize}
        height={canvasSize}
    />
    <input type="color" bind:value={color} />
</div>
<svelte:window on:resize|passive={handleResize} on:keydown={handleKeydown} />

<style>
    .container {
        width: 100vw;
        display: flex;
        height: 100vh;
        justify-content: center;
        align-items: center;
        padding: 0 50px;
    }
</style>
