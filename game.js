  // Canvas setup
        const canvas = document.getElementById('gameCanvas');
        const ctx = canvas.getContext('2d');

        // Image loading
        let assetsLoaded = 0;
        let totalAssets = 6;
        let pipeImage = new Image();
        let birdImages = {};
        let selectedBirdSprite = '2';

        // Game variables
        let gameRunning = false;
        let gameStarted = false;
        let score = 0;
        let animationId;

        // Bird configurations with unique abilities
        const birdConfigs = {
            '2': { // Tank Bird
                name: 'Tank Bird',
                width: 55, height: 55, gravity: 0.6, jumpPower: -4, speed: 1.5,
                powerName: 'SHIELD', powerDuration: 3000, powerCooldown: 8000,
                color: '#FFD700'
            },
            '3': { // Speed Demon
                name: 'Speed Demon',
                width: 30, height: 30, gravity: 0.4, jumpPower: -5, speed: 3,
                powerName: 'DASH', powerDuration: 800, powerCooldown: 4000,
                color: '#FF6347'
            },
            '4': { // Time Master
                name: 'Time Master',
                width: 40, height: 40, gravity: 0.45, jumpPower: -6, speed: 2,
                powerName: 'SLOW TIME', powerDuration: 4000, powerCooldown: 10000,
                color: '#32CD32'
            },
            '5': { // Teleporter
                name: 'Teleporter',
                width: 32, height: 32, gravity: 0.4, jumpPower: -5.5, speed: 2.5,
                powerName: 'TELEPORT', powerDuration: 2000, powerCooldown: 6000,
                color: '#FF1493'
            },
            '6': { // Wind Walker
                name: 'Wind Walker',
                width: 42, height: 42, gravity: 0.35, jumpPower: -7, speed: 2,
                powerName: 'WIND BOOST', powerDuration: 3000, powerCooldown: 7000,
                color: '#00BFFF'
            }
        };

        // Bird object
        let bird = {
            x: 80,
            y: canvas.height / 2,
            width: 40,
            height: 40,
            velocity: 0,
            gravity: 0.5,
            jumpPower: -5,
            frame: 0,
            animationSpeed: 0.2,
            // Power system
            powerActive: false,
            powerDuration: 0,
            powerCooldown: 0,
            invulnerable: false,
            dashVelocityX: 0,
            phasing: false
        };

        // Pipes array
        let pipes = [];
        const pipeWidth = 60;
        const pipeGap = 150;
        let pipeSpeed = 2;
        let gameSpeed = 1; // For time manipulation

        // Load all assets
        function loadAssets() {
            updateLoadingProgress();

            pipeImage.onload = function() {
                assetsLoaded++;
                updateLoadingProgress();
                checkAllAssetsLoaded();
            };
            pipeImage.onerror = function() {
                console.warn('Could not load pipe image, using fallback');
                assetsLoaded++;
                updateLoadingProgress();
                checkAllAssetsLoaded();
            };
            pipeImage.src = "images/transparent_pipe.png";

            for (let i = 2; i <= 6; i++) {
                const img = new Image();
                img.onload = function() {
                    assetsLoaded++;
                    updateLoadingProgress();
                    checkAllAssetsLoaded();
                };
                img.onerror = function() {
                    console.warn(`Could not load sprite_${i}.png, using fallback`);
                    assetsLoaded++;
                    updateLoadingProgress();
                    checkAllAssetsLoaded();
                };
                img.src = `images/sprite_${i}.png`;
                birdImages[i.toString()] = img;
            }
        }

        function updateLoadingProgress() {
            const progress = Math.round((assetsLoaded / totalAssets) * 100);
            document.getElementById('loadingProgress').textContent = `${progress}%`;
        }

        function checkAllAssetsLoaded() {
            if (assetsLoaded >= totalAssets) {
                document.getElementById('loadingScreen').style.display = 'none';
                setupBirdPreviews();
            }
        }

        function setupBirdPreviews() {
            const birdOptions = document.querySelectorAll('.bird-option');
            birdOptions.forEach(option => {
                const sprite = option.dataset.sprite;
                const canvas = option.querySelector('.bird-preview');
                const ctx = canvas.getContext('2d');

                if (birdImages[sprite] && birdImages[sprite].complete) {
                    ctx.imageSmoothingEnabled = false;
                    ctx.drawImage(birdImages[sprite], 5, 5, canvas.width-10, canvas.height-10);
                } else {
                    const config = birdConfigs[sprite];
                    ctx.fillStyle = config.color;
                    ctx.beginPath();
                    ctx.arc(30, 30, 25, 0, Math.PI * 2);
                    ctx.fill();
                }

                option.addEventListener('click', () => selectBird(sprite));
            });

            selectBird('2');
        }

        function selectBird(sprite) {
            selectedBirdSprite = sprite;
            document.querySelectorAll('.bird-option').forEach(opt => {
                opt.classList.remove('selected');
            });
            document.querySelector(`[data-sprite="${sprite}"]`).classList.add('selected');
            
            updatePowerDisplay();
        }

        function updatePowerDisplay() {
            const config = birdConfigs[selectedBirdSprite];
            document.getElementById('powerName').textContent = config.powerName;
            
            // Update cooldown bar
            const cooldownPercent = bird.powerCooldown <= 0 ? 100 : 
                ((config.powerCooldown - bird.powerCooldown) / config.powerCooldown) * 100;
            document.getElementById('cooldownBar').style.width = cooldownPercent + '%';
            
            if (bird.powerActive) {
                document.getElementById('powerInfo').classList.add('power-active');
            } else {
                document.getElementById('powerInfo').classList.remove('power-active');
            }
        }

        function applyBirdConfig() {
            const config = birdConfigs[selectedBirdSprite];
            bird.width = config.width;
            bird.height = config.height;
            bird.gravity = config.gravity;
            bird.jumpPower = config.jumpPower;
            pipeSpeed = config.speed;
        }

        function activatePower() {
            if (bird.powerCooldown > 0 || bird.powerActive) return;
            
            const config = birdConfigs[selectedBirdSprite];
            bird.powerActive = true;
            bird.powerDuration = config.powerDuration;
            bird.powerCooldown = config.powerCooldown;
            
            switch(selectedBirdSprite) {
                case '2': // Tank - Shield
                    bird.invulnerable = true;
                    break;
                case '3': // Speed Demon - Dash
                    bird.dashVelocityX = 8;
                    break;
                case '4': // Time Master - Slow Time
                    gameSpeed = 0.3;
                    break;
                case '5': // Teleporter - Phase
                    bird.phasing = true;
                    break;
                case '6': // Wind Walker - Wind Boost
                    bird.velocity = -10; // Super jump
                    bird.gravity = 0.1; // Reduced gravity
                    break;
            }
        }

        function updatePowerEffects(deltaTime) {
            if (bird.powerActive) {
                bird.powerDuration -= deltaTime;
                if (bird.powerDuration <= 0) {
                    deactivatePower();
                }
            }
            
            if (bird.powerCooldown > 0) {
                bird.powerCooldown -= deltaTime;
            }
            
            // Handle dash effect
            if (bird.dashVelocityX > 0) {
                bird.x += bird.dashVelocityX;
                bird.dashVelocityX *= 0.85; // Decay
                if (bird.dashVelocityX < 0.5) {
                    bird.dashVelocityX = 0;
                    bird.x = 80; // Reset position
                }
            }
        }

        function deactivatePower() {
            bird.powerActive = false;
            bird.invulnerable = false;
            bird.phasing = false;
            bird.dashVelocityX = 0;
            gameSpeed = 1;
            
            // Reset Wind Walker gravity
            if (selectedBirdSprite === '6') {
                bird.gravity = birdConfigs['6'].gravity;
            }
        }

        function showBirdSelection() {
            document.getElementById('gameOver').style.display = 'none';
            document.getElementById('birdSelection').style.display = 'block';
        }

        function startGameWithSelectedBird() {
            document.getElementById('birdSelection').style.display = 'none';
            applyBirdConfig();
            initGame();
        }

        function createPipe(x) {
            const minHeight = 50;
            const maxHeight = canvas.height - pipeGap - minHeight;
            const upperHeight = Math.random() * (maxHeight - minHeight) + minHeight;

            return {
                x: x,
                upperHeight: upperHeight,
                lowerY: upperHeight + pipeGap,
                lowerHeight: canvas.height - (upperHeight + pipeGap),
                passed: false
            };
        }

        function initGame() {
            pipes = [];
            for (let i = 0; i < 3; i++) {
                pipes.push(createPipe(canvas.width + i * 200));
            }
            gameSpeed = 1;
            deactivatePower();
        }

        function drawBird() {
            const currentBirdImage = birdImages[selectedBirdSprite];
            
            // Special effects based on active power
            if (bird.powerActive) {
                ctx.save();
                
                switch(selectedBirdSprite) {
                    case '2': // Shield effect
                        ctx.shadowColor = '#FFD700';
                        ctx.shadowBlur = 20;
                        break;
                    case '3': // Speed trail
                        ctx.shadowColor = '#FF6347';
                        ctx.shadowBlur = 15;
                        break;
                    case '4': // Time distortion
                        ctx.globalAlpha = 0.8;
                        ctx.shadowColor = '#32CD32';
                        ctx.shadowBlur = 25;
                        break;
                    case '5': // Phasing effect
                        ctx.globalAlpha = 0.6;
                        ctx.shadowColor = '#FF1493';
                        ctx.shadowBlur = 30;
                        break;
                    case '6': // Wind effect
                        ctx.shadowColor = '#00BFFF';
                        ctx.shadowBlur = 20;
                        break;
                }
            }

            if (currentBirdImage && currentBirdImage.complete) {
                ctx.imageSmoothingEnabled = false;
                ctx.save();
                ctx.translate(bird.x + bird.width/2, bird.y + bird.height/2);

                let rotation = 0;
                if (bird.velocity < 0) {
                    rotation = -0.3;
                } else if (bird.velocity > 3) {
                    rotation = 0.5;
                }
                ctx.rotate(rotation);

                ctx.drawImage(currentBirdImage, -bird.width/2, -bird.height/2, bird.width, bird.height);
                ctx.restore();
            } else {
                const config = birdConfigs[selectedBirdSprite];
                ctx.fillStyle = config.color;
                ctx.beginPath();
                ctx.ellipse(bird.x + bird.width/2, bird.y + bird.height/2, 
                           bird.width/2, bird.height/2, 0, 0, Math.PI * 2);
                ctx.fill();

                // Simple eye
                ctx.fillStyle = 'white';
                ctx.beginPath();
                ctx.arc(bird.x + bird.width/2 + 5, bird.y + bird.height/2 - 3, 4, 0, Math.PI * 2);
                ctx.fill();

                ctx.fillStyle = 'black';
                ctx.beginPath();
                ctx.arc(bird.x + bird.width/2 + 6, bird.y + bird.height/2 - 3, 2, 0, Math.PI * 2);
                ctx.fill();
            }
            
            if (bird.powerActive) {
                ctx.restore();
            }
        }

        function drawPipe(pipe) {
            if (pipeImage && pipeImage.complete) {
                ctx.save();
                ctx.scale(1, -1);
                ctx.drawImage(pipeImage, pipe.x, -pipe.upperHeight, pipeWidth, pipe.upperHeight);
                ctx.restore();

                ctx.drawImage(pipeImage, pipe.x, pipe.lowerY, pipeWidth, pipe.lowerHeight);
            } else {
                ctx.fillStyle = '#32CD32';
                ctx.fillRect(pipe.x, 0, pipeWidth, pipe.upperHeight);
                ctx.fillRect(pipe.x, pipe.lowerY, pipeWidth, pipe.lowerHeight);

                ctx.fillStyle = '#228B22';
                ctx.fillRect(pipe.x - 5, pipe.upperHeight - 20, pipeWidth + 10, 20);
                ctx.fillRect(pipe.x - 5, pipe.lowerY, pipeWidth + 10, 20);
            }
        }

        function drawBackground() {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            for (let i = 0; i < 3; i++) {
                const x = (Date.now() * 0.02 * gameSpeed + i * 150) % (canvas.width + 100) - 50;
                const y = 50 + i * 40;

                ctx.beginPath();
                ctx.arc(x, y, 20, 0, Math.PI * 2);
                ctx.arc(x + 25, y, 25, 0, Math.PI * 2);
                ctx.arc(x + 50, y, 20, 0, Math.PI * 2);
                ctx.arc(x + 25, y - 15, 15, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        function updateBird() {
            if (gameRunning) {
                bird.velocity += bird.gravity * gameSpeed;
                bird.y += bird.velocity * gameSpeed;
                bird.frame += bird.animationSpeed;

                if (bird.y < 0) bird.y = 0;
                if (bird.y + bird.height > canvas.height) {
                    bird.y = canvas.height - bird.height;
                    if (!bird.invulnerable) {
                        gameOver();
                    }
                }
            }
        }

        function updatePipes() {
            if (!gameRunning) return;

            for (let i = pipes.length - 1; i >= 0; i--) {
                const pipe = pipes[i];
                pipe.x -= pipeSpeed * gameSpeed;

                if (!pipe.passed && pipe.x + pipeWidth < bird.x) {
                    pipe.passed = true;
                    score++;
                    document.getElementById('score').textContent = `Score: ${score}`;
                }

                if (pipe.x + pipeWidth < 0) {
                    pipes.splice(i, 1);
                    pipes.push(createPipe(pipes[pipes.length - 1].x + 200));
                }
            }
        }

        function checkCollisions() {
            if (!gameRunning || bird.invulnerable || bird.phasing) return;

            for (const pipe of pipes) {
                if (bird.x < pipe.x + pipeWidth && bird.x + bird.width > pipe.x) {
                    if (bird.y < pipe.upperHeight || bird.y + bird.height > pipe.lowerY) {
                        gameOver();
                        return;
                    }
                }
            }
        }

        function gameOver() {
            gameRunning = false;
            deactivatePower();
            document.getElementById('finalScore').textContent = score;
            document.getElementById('birdUsed').textContent = `Bird: ${birdConfigs[selectedBirdSprite].name}`;
            document.getElementById('gameOver').style.display = 'block';
        }

        function resetGame() {
            bird.x = 80;
            bird.y = canvas.height / 2;
            bird.velocity = 0;
            bird.frame = 0;
            score = 0;
            gameStarted = false;
            gameRunning = false;
            document.getElementById('score').textContent = 'Score: 0';
            document.getElementById('gameOver').style.display = 'none';
            applyBirdConfig();
            initGame();
        }

        function jump() {
            if (!gameStarted) {
                gameStarted = true;
                gameRunning = true;
            }

            if (gameRunning) {
                bird.velocity = bird.jumpPower;
            }
        }

        let lastTime = 0;
        function gameLoop(currentTime) {
            const deltaTime = currentTime - lastTime;
            lastTime = currentTime;

            ctx.clearRect(0, 0, canvas.width, canvas.height);

            drawBackground();
            updateBird();
            updatePipes();
            updatePowerEffects(deltaTime);
            checkCollisions();

            for (const pipe of pipes) {
                drawPipe(pipe);
            }
            drawBird();

            updatePowerDisplay();

            if (!gameStarted && gameRunning === false && 
                document.getElementById('birdSelection').style.display === 'none') {
                ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
                ctx.font = '24px Arial';
                ctx.textAlign = 'center';
                ctx.fillText('Press SPACE to Start!', canvas.width/2, canvas.height/2 - 100);
                ctx.font = '16px Arial';
                ctx.fillText('SHIFT for Power!', canvas.width/2, canvas.height/2 - 70);
            }

            animationId = requestAnimationFrame(gameLoop);
        }

        // Event listeners
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space') {
                e.preventDefault();
                jump();
            }
            if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
                e.preventDefault();
                activatePower();
            }
        });

        canvas.addEventListener('click', jump);

        // Initialize and start
        loadAssets();
        requestAnimationFrame(gameLoop);
 
