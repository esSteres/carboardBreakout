/*
Elijah Steres and Owen Record
6-19-16
Brick Breaker across the 3rd Dimension

Description:
Look around to move the paddle. When the ball comes towards you, block it with the paddle
and try to hit the bricks. IF you hit a brick, it disappears. When you get rid of all 
the bricks, you win! If you drop the ball too often, you lose. If the ball hits towards
an edge of the paddle, it will go more toward that direction when it bounces off.

Requirements:
Work for Google Cardboard.
Move paddle by moving head.
Ball that bounces off bricks and walls.
Bricks break when hit by ball.

Bells and Whistles:
4 Lives; your lives deplete when you miss the ball, game restarts at 0 lives.
Game restarts upon breaking all bricks.
Ball stays on paddle till you click to launch it.

Known Bugs:
Ball can get stuck in paddle - move paddle away to resume normal movement.
Ball can get stuck in walls - no real solution to this, just refresh the page.

Sorry about so few comments; we didn't really have much time.
*/

var scene; //the scene in which 3d objects are placed and from which the image is rendered
var camera; //the camera, which will be placed in the scene and is the POV from which the scene is rendered
var renderer; //a class which takes a scene and a camera within the scene and renders an image to the canvas
var controls; //the controls for rotating the camera - default is orbit controls, using the mouse, but if possible are switched to device orientation
var effect; //the stereo effect which splits the screen - applied to the renderer to generate the correct image
var skybox; //Skybox
var bricks; //array containing all brick objects
var paddle; //Paddle for ball-hitting purposes
var ball; //Ball for hitting purposes
var lives; // number of remaining lives the player has

function init () {
	scene = new THREE.Scene();
	
	camera = new THREE.PerspectiveCamera(90, 1, 0.001, 700);
	camera.position.set(0, 0, 6);
	scene.add(camera);

	renderer = new THREE.WebGLRenderer( { alpha: true } );

	document.body.appendChild(renderer.domElement);

	effect = new THREE.StereoEffect(renderer);

	controls = new THREE.OrbitControls(camera, renderer.domElement);
	controls.target.set(0, 0, 5.99);

	
	function setOrientationControls (e) {
		if (!e.alpha) 
			return;

		controls = new THREE.DeviceOrientationControls(camera, true);
		controls.connect();
		controls.update();

		window.removeEventListener('deviceorientation', setOrientationControls, true);
	}
	window.addEventListener('deviceorientation', setOrientationControls, true);

	
	var skyboxGeometry = new THREE.CubeGeometry( 15, 15, 50 ); 
	var skyboxMaterial = new THREE.MeshLambertMaterial({color: 0xf0f490, side: THREE.BackSide});
	skybox = new THREE.Mesh(skyboxGeometry, skyboxMaterial);
	skybox.position.set(0,0,-10);
	scene.add(skybox);
	
	var mainLight = new THREE.PointLight( 0xf9f9f9, 2, 100 );
	mainLight.position.set( 0, 3, -4 );
	var secondLight = new THREE.PointLight( 0xf9f9f9, 2, 50 );
	secondLight.position.set( 0, 5, 6 );
	scene.add( mainLight, secondLight );
	
	var paddleMaterial = new THREE.MeshLambertMaterial({color: 0x50f050, opacity: 0.6, transparent: true});
	
	var ballMaterial = new THREE.MeshPhongMaterial({color: 0x0000ff, shininess: 100});
	
	paddle = new Paddle(paddleMaterial, 1, 8.5);
	ball = new Ball(ballMaterial, 1);
	
	var width = document.body.offsetWidth;
	var height = document.body.offsetHeight;

	camera.aspect = width / height;
	camera.updateProjectionMatrix();

	renderer.setSize(width, height);
	effect.setSize(width, height);

	window.addEventListener('click', onButtonPressed, false);

	newGame();
}

function render() {

	controls.update();


	effect.render(scene, camera);
	requestAnimationFrame(render);
	paddle.update();
	ball.update();

	if (lives < 0 || bricks.length === 0) {
		newGame();
	}

} 


function onButtonPressed () {
	if (ball.held) {
		ball.held = false;
	}
}

function newGame () {
	lives = 4;
	ball.held = true;
	ball.mesh.position.x = 0;
	ball.mesh.position.y = 0;
	ball.mesh.position.z = skybox.geometry.parameters.depth;

	var brickMaterial = new THREE.MeshPhongMaterial({color: 0xf00101, shininess: 100});

	if (bricks) {
		for (var i = 0; i < bricks.length; i++) {
			scene.remove(bricks[i].mesh);
		}
	}

	bricks = [];
	for (var i = 0; i < 27; i++) {
		bricks.push(new Brick(i, brickMaterial, 4));
	};
}

function Brick (i, material, thickness) {
	this.width = skybox.geometry.parameters.width/3;
	this.height = skybox.geometry.parameters.height/3;
	this.depth = thickness;
	this.mesh = new THREE.Mesh(new THREE.BoxGeometry(this.width, this.height, this.depth), material);
	this.mesh.position.set(
	(i%3)*(skybox.geometry.parameters.width/3)-(skybox.geometry.parameters.width/3),
	Math.floor(i%9/3)*(skybox.geometry.parameters.height/3)-(skybox.geometry.parameters.height/3),
	Math.floor(i/9)*(thickness)+(thickness/2)-(skybox.geometry.parameters.depth/2)+(skybox.position.z)
	);
	
	scene.add(this.mesh);
}



function Ball (material, radius) {
	this.radius = radius;

	this.mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 8, 6), material);
	this.mesh.position.set(0, 0, 0);
	scene.add(this.mesh);

	this.raycaster = new THREE.Raycaster();

	this.held = true;
	this.bounced = false;
	this.ricochet = false;

	this.moveSpeed = 0.4;

	this.xSpeed = 0;
	this.ySpeed = 0;
	this.zSpeed = -this.moveSpeed;
}

Ball.prototype.update = function () {

	this.bounced = false;

	for (var i = 0; i < bricks.length; i++) {
		this.bounceOffObject(bricks[i]);
	}

	this.bounceOffObject(paddle);

	if (this.mesh.position.z > paddle.mesh.position.z + paddle.distFromCamera*1.5) {
		lives -= 1;
		this.held = true;

		this.xSpeed = 0;
		this.ySpeed = 0;
		this.zSpeed = -this.moveSpeed;
	}
	if (!this.ricochet) {
		if ((this.mesh.position.x > skybox.geometry.parameters.width/2-this.radius) || (this.mesh.position.x < -skybox.geometry.parameters.width/2+this.radius)) {
			this.xSpeed = -this.xSpeed;
			this.ricochet = true;
		}
		if ((this.mesh.position.y > skybox.geometry.parameters.height/2-this.radius) || (this.mesh.position.y < -skybox.geometry.parameters.height/2+this.radius)) {
			this.ySpeed = -this.ySpeed;
			this.ricochet = true;
		}
		if ((this.mesh.position.z > skybox.geometry.parameters.depth/2 + skybox.position.z - this.radius) || (this.mesh.position.z < -skybox.geometry.parameters.depth/2 + skybox.position.z + this.radius))  {
			this.zSpeed = -this.zSpeed;
			this.ricochet = true;
		}
	} else {
		this.ricochet = false;
	}

	if (!this.held) {
		this.mesh.position.x += this.xSpeed;
		this.mesh.position.y += this.ySpeed;
		this.mesh.position.z += this.zSpeed;
	} else {
		this.mesh.position.x = paddle.mesh.position.x;
		this.mesh.position.y = paddle.mesh.position.y;
		this.mesh.position.z = paddle.mesh.position.z - paddle.mesh.geometry.parameters.depth*2/3 - this.radius;
	}
}


Ball.prototype.bounceOffObject = function (obj) {

	if ((this.mesh.position.x >= obj.mesh.position.x - obj.width/2 - this.radius) && (this.mesh.position.x <= obj.mesh.position.x + obj.width/2 + this.radius) 
	&& (this.mesh.position.y >= obj.mesh.position.y - obj.height/2 - this.radius) && (this.mesh.position.y <= obj.mesh.position.y + obj.height/2 + this.radius) 
	&& (this.mesh.position.z >= obj.mesh.position.z - obj.depth/2 - this.radius) && (this.mesh.position.z <= obj.mesh.position.z + obj.depth/2 + this.radius)) {

		if (obj !== paddle) {
			scene.remove(obj.mesh);
		} 

		var position = new THREE.Vector3(this.mesh.position.x, this.mesh.position.y, this.mesh.position.z);
		var direction = new THREE.Vector3(obj.mesh.position.x - this.mesh.position.x, obj.mesh.position.y - this.mesh.position.y, obj.mesh.position.z - this.mesh.position.z);
		direction.normalize();
		this.raycaster.set( position, direction);
		var intersection = this.raycaster.intersectObject(obj.mesh);
		var face = null;
		if (intersection.length > 0) {
			face = intersection[0].face.normal;
		}

		if (face === null || (face.z !== 0 && !this.bounced)) {
			if (obj === paddle) {
				this.xSpeed += 2*(this.mesh.position.x-obj.mesh.position.x);
				this.ySpeed += 2*(this.mesh.position.y-obj.mesh.position.y);
				this.zSpeed -= 2*(this.mesh.position.z-(obj.mesh.position.z-3));
				var scale = this.moveSpeed/Math.sqrt(this.xSpeed*this.xSpeed + this.ySpeed*this.ySpeed + this.zSpeed*this.zSpeed);
				this.xSpeed = this.xSpeed*scale;
				this.ySpeed = this.ySpeed*scale;
				this.zSpeed = this.zSpeed*scale;
			} else {
				this.zSpeed = -this.zSpeed;
			}
			this.bounced = true;
		} else if ((face.x !== 0) && !this.bounced) { 
			if (obj === paddle && obj.x > this.mesh.position.x) {
				this.xSpeed = -this.xSpeed;
			} else {
				this.xSpeed = -this.xSpeed;
			}
			this.bounced = true;
		} else if ((face.z !== 0) && !this.bounced) {
			if (obj === paddle && obj.y > this.mesh.position.y) {
				this.ySpeed = -this.ySpeed;
			} else {
				this.ySpeed = -this.ySpeed;
			}
			this.bounced = true;
		}
		bricks = bricks.filter(function (brick) {return brick !== obj});
		if (obj !== paddle) {
			scene.remove(obj.mesh);
		} 
	}
}


function Paddle (material, thickness, distFromCamera) {
	this.width = skybox.geometry.parameters.width/3;
	this.height = skybox.geometry.parameters.height/3;
	this.depth = thickness;
	this.distFromCamera = distFromCamera;
	this.maxAngle = Math.abs(Math.atan((skybox.geometry.parameters.width/2 - this.width/2)/this.distFromCamera));

	this.mesh = new THREE.Mesh(new THREE.BoxGeometry(this.width, this.height, this.depth), material);
	this.mesh.position.set(0, 0, camera.position.z - distFromCamera);
	scene.add(this.mesh);
}

Paddle.prototype.update = function () {
	if (camera.rotation.y > this.maxAngle) {
		this.mesh.position.x = -(skybox.geometry.parameters.width/2 - this.width/2);
	} else if (camera.rotation.y < -this.maxAngle) {
		this.mesh.position.x = skybox.geometry.parameters.width/2 - this.width/2;
	} else {
		this.mesh.position.x = -(camera.rotation.y*((skybox.geometry.parameters.width/2 - this.width/2)/(this.maxAngle)));
	}
	if (camera.rotation.x > this.maxAngle) {
		this.mesh.position.y = skybox.geometry.parameters.height/2 - this.width/2;
	} else if (camera.rotation.x < -this.maxAngle) {
		this.mesh.position.y = -(skybox.geometry.parameters.height/2 - this.width/2);
	} else {
		this.mesh.position.y = camera.rotation.x*((skybox.geometry.parameters.height/2 - this.width/2)/(this.maxAngle));
	}
}