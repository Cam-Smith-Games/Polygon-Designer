// canvas and it's 2d context to draw with
var canvas, ctx;

// the shapes being drawn (each polygon is an array of points, where a point is [x,y])
var polygons = [[]];

// properties for drawing grid lines and zooming
// pointScale = num pixels per coordinate point
// gridScale = num points per grid line
// therefore, (pointScale * gridScale) = num pixels per grid line
// when we zoom with scroll wheel, the point scale is modified
var pointScale = 5, gridScale = 5, showCoords = false, pixelsPerGridLine = pointScale * gridScale, scale = 1;

// properties for dragging screen around and keeping track of mouse position
var dragging = false, lastDragPos = [0, 0], dragOffset = [0,0], mousePos = [0,0];

var showGrid = false, showCoords = false;

$(document).ready(function () {
    var $canvas = $("canvas");
    canvas = $canvas[0];
    ctx = canvas.getContext("2d");
    ctx.strokeWidth = 15;
    ctx.font = '24px arial bold';
    ctx.fontColor = "white";
    ctx.textAlign = "center";

    setInterval(loop, 1000 / 30);

    $("#btnClear").on("click", clear);
    $("#btnUndo").on("click", undo);

    $("#btnTrace").on("click", function () {
        let url = window.prompt("Enter Image URL");
        console.log(url);
        $canvas.css("background-image", "url(" + url + ")");
    });

    $("#btnToggleGrid").on("click", function () {
        showGrid = !$(this).hasClass("on");
        $(this).html(showGrid ? "Grid ON" : "Grid OFF").toggleClass("on");
    });
    $("#btnToggleCoords").on("click", function () {
        showCoords = !$(this).hasClass("on");
        $(this).html(showCoords ? "Coords ON" : "Coords OFF").toggleClass("on");
    });

    $(document)
        .on("contextmenu", function (e) {
            // prevent context menu from appearing
            e.preventDefault(); 
        })
        .on("mouseup", function (e) {
            // release right click -> stop dragging
            // NOTE: need to put this on document rather than canvas so we can release right click from anywhere, otherwise we'd have to release ontop of canvas to stop
            if (e.button == 2) {
                dragging = false;
            }
        });

    $canvas
        // click canvas -> add point to polygon
        .on("click", function (e) {
            let mouse = getCanvasCoords(e.clientX, e.clientY, true);
            polygons[polygons.length-1].push(mouse);

            //console.log("push: (" + mouse[0] + "," + mouse[1] + ")", polygon);
            output();
        })
        // right click canvas -> start dragging
        .on("mousedown", function (e) {
            if (e.button == 2) {
                dragging = true;
                lastDragPos = getCanvasCoords(e.clientX, e.clientY);
            }
        })
        // moving mouse over canvas while dragging -> add differnece in position to drag offset 
        .on("mousemove", function (e) {
            mousePos = getCanvasCoords(e.clientX, e.clientY);
            if (dragging) {
                dragOffset[0] += (mousePos[0] - lastDragPos[0]);
                dragOffset[1] += (mousePos[1] - lastDragPos[1]);
                lastDragPos = mousePos;
            }
        })
        .on("wheel", function (e) {
            // prevent scrolling on page
            e.preventDefault(true);

            let wheel = e.originalEvent.wheelDelta > 0 ? 1 : -1;

            // don't allow zooming in/out past these points
            if ((wheel < 0 && scale < 0.5) || (wheel > 0 && scale > 2)) {
                return;
            }

            // wheelDelta: positive -> zooming in, negative -> zooming out
            let zoom = Math.exp(wheel * 0.25)
            scale *= zoom;

            console.log(zoom);
        });


});

function clear() {
    console.log("clearing");
    polygon = [[0,0]];
    output();
}

function undo() {
    if (polygon.length > 0) {
        polygon.pop();
        output();
    }
}

function output() {
    let outer = "";

    polygons.forEach(polygon => {
        let str = "";

        polygon.forEach(point => {
            str += "[" + point[0] + ", " + point[1] + "],\n";
        });
        if (str.length > 0) {
            str = str.substr(0, str.length - 2);
        }
        outer += "[\n" + str + "\n]";
    });

    $("#output").val(outer);
}

function loop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(dragOffset[0] + canvas.width / 2, dragOffset[1] + canvas.height / 2);
    ctx.scale(scale, scale);


    // #region drawing grid
    if (showGrid) {
        // don't bother asking about this math because I wont be able to explain lol. took me forever
        // counteracting translate and scale: x0 = minX, x1 = maxX
        let x0 = (-dragOffset[0] - canvas.width / 2) / scale;
        let x1 = x0 + canvas.width / scale;
        x0 -= (x0 % pixelsPerGridLine);

        let y0 = (-dragOffset[1] - canvas.height / 2) / scale;
        let y1 = y0 + canvas.height / scale;
        y0 -= (y0 % pixelsPerGridLine);



        for (var x = x0; x < x1; x += pixelsPerGridLine) {
            ctx.beginPath();
            ctx.moveTo(x, y0);
            ctx.lineTo(x, y1);
            ctx.closePath();
            ctx.stroke();
        }

        for (var y = y0; y < y1; y += pixelsPerGridLine) {
            ctx.beginPath();
            ctx.moveTo(x0, y);
            ctx.lineTo(x1, y);
            ctx.closePath();
            ctx.stroke();
        }
    }
    // #endregion drawing grid


    ctx.beginPath();
    ctx.strokeStyle = "blue";
    ctx.fillStyle = "blue";

    polygons.forEach(polygon => {
        for (var i = 0; i < polygon.length; i++) {
            let point = polygon[i];
            ctx.lineTo(point[0], point[1]);
            let dist = distanceTo(mousePos, point);
            ctx.fillStyle = dist < 5 ? "purple" : (i == polygon.length - 1) ? "red" : "blue";
            ctx.fillRect(point[0] - 5, point[1] - 5, 10, 10);


            if (showCoords) {
                ctx.fillStyle = "red";
                ctx.fillRect(point[0] - 80, point[1] - 30, 160, 25);
                ctx.fillStyle = "white";
                ctx.fillText("(" + point[0].toFixed(2) + "," + point[1].toFixed(2) + ")", point[0], point[1] - 10);
            }
        }
    });

    ctx.closePath();
    ctx.stroke();
    

    ctx.restore();
}

function distanceTo(p0, p1) {
    return Math.sqrt(Math.pow(p1[0] - p0[0], 2) + Math.pow(p1[1] - p0[1], 2));
}

// this method converts screen coordinate to a canvaas coordinate
function getCanvasCoords(x, y, applyOffset) {
    // subtract canvas pos to get screen coordinates relative to canvas
    let canv = canvas.getBoundingClientRect();

    if (applyOffset) {
        return [(x - canv.left - dragOffset[0] - canvas.width / 2) / scale, (y - canv.top - dragOffset[1] - canvas.height / 2) / scale];
    }

    return [x - canv.left, y - canv.top];

}
