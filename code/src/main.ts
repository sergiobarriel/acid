function Startup() : void {

    BindStream('video', 'canvas');

    BindFullScreen();
}

async function BindStream(videoTag: string, canvasTag: string) : Promise<void> {

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Your browser doesn't support streaming");
    }

    const stream = await navigator.mediaDevices.getUserMedia({ 
        video: {
            width: { ideal: 1280 },
            height: { ideal: 720 }
        }, 
        audio: false 
    });

    let htmlVideoElement = document.getElementById(videoTag) as HTMLVideoElement;    

    if(htmlVideoElement) {
        htmlVideoElement.autoplay = true;
        htmlVideoElement.playsInline = true;
        htmlVideoElement.srcObject = stream;

        htmlVideoElement.addEventListener('play', () => {
            Draw(canvasTag, htmlVideoElement)
        }, false);
    }
}

function Draw(canvasTag: string, videoElement: HTMLVideoElement) : void {

    let canvasHtmlElement = document.getElementById(canvasTag) as HTMLCanvasElement;

    canvasHtmlElement.width = canvasHtmlElement.clientWidth;
    canvasHtmlElement.height = canvasHtmlElement.clientHeight;
    
    if(canvasHtmlElement) {

        let context = canvasHtmlElement.getContext('2d');

        function ProcessFrame() : void {

            context?.drawImage(videoElement, 0, 0, canvasHtmlElement.width, canvasHtmlElement.height);

            let image = context?.getImageData(0, 0, canvasHtmlElement.width, canvasHtmlElement.height);

            if(image) {

                // image = detectEdges(image);

                image = ConvertToGrayScale(image);

                //image = GlitchEffect(image, true);

                context?.putImageData(image, 0, 0);
            }
            
            requestAnimationFrame(ProcessFrame);
                   
        }
        
        ProcessFrame();
    }
}


let glitchOffsets = {
    redOffsetX: 0,
    greenOffsetX: 0,
    blueOffsetX: 0,
    redOffsetY: 0,
    greenOffsetY: 0,
    blueOffsetY: 0
};

function GlitchEffect(imageData: ImageData, noise: boolean) : ImageData {

    const width = imageData.width;
    const height = imageData.height;
    const data = imageData.data;

    const resultData = new Uint8ClampedArray(data.length);

    for (let i = 0; i < data.length; i++) {
        resultData[i] = data[i];
    }
    
    if (!glitchOffsets || Math.random() < 0.03) {
        glitchOffsets = {
            redOffsetX: Math.floor(Math.random() * 8) - 4,
            greenOffsetX: Math.floor(Math.random() * 8) - 4,
            blueOffsetX: Math.floor(Math.random() * 8) - 4,
            
            redOffsetY: Math.floor(Math.random() * 8) - 4,
            greenOffsetY: Math.floor(Math.random() * 8) - 4,
            blueOffsetY: Math.floor(Math.random() * 8) - 4
        };
    }
    
    const { redOffsetX, greenOffsetX, blueOffsetX, 
            redOffsetY, greenOffsetY, blueOffsetY } = glitchOffsets;
    
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const currentIndex = (y * width + x) * 4;

            const redX = Math.max(0, Math.min(width - 1, x + redOffsetX));
            const redY = Math.max(0, Math.min(height - 1, y + redOffsetY));
            const redIndex = (redY * width + redX) * 4;
            
            const greenX = Math.max(0, Math.min(width - 1, x + greenOffsetX));
            const greenY = Math.max(0, Math.min(height - 1, y + greenOffsetY));
            const greenIndex = (greenY * width + greenX) * 4;
            
            const blueX = Math.max(0, Math.min(width - 1, x + blueOffsetX));
            const blueY = Math.max(0, Math.min(height - 1, y + blueOffsetY));
            const blueIndex = (blueY * width + blueX) * 4;
            
            resultData[currentIndex] = data[redIndex]; 
            resultData[currentIndex + 1] = data[greenIndex + 1]; 
            resultData[currentIndex + 2] = data[blueIndex + 2]; 
        }
    }
    
    if(noise) {

        if (Math.random() < 0.01) {

            const noiseY = Math.floor(Math.random() * height);
            const noiseHeight = Math.floor(Math.random() * 10) + 1;
            
            for (let y = noiseY; y < Math.min(noiseY + noiseHeight, height); y++) {
                for (let x = 0; x < width; x++) {
                    const index = (y * width + x) * 4;
                    
                    resultData[index] = 255;     // R
                    resultData[index + 1] = 255; // G
                    resultData[index + 2] = 255; // B
                }
            }
        }
    }
    
    return new ImageData(resultData, width, height);
}

function ConvertToGrayScale(frame: ImageData) : ImageData {

    const grayscale = new Uint8ClampedArray(frame.width * frame.height * 4);

    for (let i = 0; i < frame.data.length; i += 4) {

        const r = frame.data[i];
        const g = frame.data[i + 1];
        const b = frame.data[i + 2];

        const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);

        grayscale[i] = gray;
        grayscale[i + 1] = gray;
        grayscale[i + 2] = gray;
        grayscale[i + 3] = 255; 
    }

    return new ImageData(grayscale, frame.width, frame.height);
}


let previousFrame: ImageData | null = null;

function detectEdges(imageData: ImageData): ImageData {

    const width = imageData.width;
    const height = imageData.height;
    const data = imageData.data;
    
    const resultData = new Uint8ClampedArray(data.length);
    
    for (let i = 0; i < resultData.length; i += 4) {
        resultData[i] = 0;     // R
        resultData[i + 1] = 0; // G
        resultData[i + 2] = 0; // B
        resultData[i + 3] = 255; // A
    }
    
    if (!previousFrame) {
        previousFrame = new ImageData(
            new Uint8ClampedArray(data), 
            width, 
            height
        );
        return new ImageData(resultData, width, height);
    }

    const currentGray = new Uint8ClampedArray(width * height);
    const previousGray = new Uint8ClampedArray(width * height);
    
    for (let i = 0; i < data.length; i += 4) {

        const r1 = data[i];
        const g1 = data[i + 1];
        const b1 = data[i + 2];
        const gray1 = Math.round(0.299 * r1 + 0.587 * g1 + 0.114 * b1);
        currentGray[i / 4] = gray1;
        
        const r2 = previousFrame.data[i];
        const g2 = previousFrame.data[i + 1];
        const b2 = previousFrame.data[i + 2];
        const gray2 = Math.round(0.299 * r2 + 0.587 * g2 + 0.114 * b2);

        previousGray[i / 4] = gray2;
    }
    
    const motionMask = new Uint8ClampedArray(width * height);
    const motionThreshold = 15; 
    
    for (let i = 0; i < currentGray.length; i++) {
        const diff = Math.abs(currentGray[i] - previousGray[i]);
        motionMask[i] = diff > motionThreshold ? 255 : 0;
    }
    
    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            const index = y * width + x;
            
            if (motionMask[index] > 0) {

                const topLeft = currentGray[index - width - 1];
                const top = currentGray[index - width];
                const topRight = currentGray[index - width + 1];
                const left = currentGray[index - 1];
                const right = currentGray[index + 1];
                const bottomLeft = currentGray[index + width - 1];
                const bottom = currentGray[index + width];
                const bottomRight = currentGray[index + width + 1];
                
                const gx = -topLeft - 2 * left - bottomLeft + topRight + 2 * right + bottomRight;
                
                const gy = -topLeft - 2 * top - topRight + bottomLeft + 2 * bottom + bottomRight;
                
                const magnitude = Math.sqrt(gx * gx + gy * gy);
                
                const threshold = 60;
                const isEdge = magnitude > threshold ? 255 : 0;
                
                const dataIndex = (y * width + x) * 4;
                resultData[dataIndex] = isEdge;     // R
                resultData[dataIndex + 1] = isEdge; // G
                resultData[dataIndex + 2] = isEdge; // B
                resultData[dataIndex + 3] = 255;    // A 
            }
        }
    }
    
    previousFrame = new ImageData(
        new Uint8ClampedArray(data), 
        width, 
        height
    );
    
    return new ImageData(resultData, width, height);
}


function BindFullScreen(): void {

    const button = document.getElementById('fullScreen');
    const container = document.querySelector('.container') as HTMLElement;
    
    if (button && container) {
        button.addEventListener('click', () => {
            if (!document.fullscreenElement) {

                if (container.requestFullscreen) {
                    container.requestFullscreen();
                } else if ((container as any).mozRequestFullScreen) { // Firefox
                    (container as any).mozRequestFullScreen();
                } else if ((container as any).webkitRequestFullscreen) { // Chrome, Safari
                    (container as any).webkitRequestFullscreen();
                } else if ((container as any).msRequestFullscreen) { // IE/Edge
                    (container as any).msRequestFullscreen();
                }
            } else {
                if (document.exitFullscreen) {
                    document.exitFullscreen();
                } else if ((document as any).mozCancelFullScreen) {
                    (document as any).mozCancelFullScreen();
                } else if ((document as any).webkitExitFullscreen) {
                    (document as any).webkitExitFullscreen();
                } else if ((document as any).msExitFullscreen) {
                    (document as any).msExitFullscreen();
                }
            }
        });
    }
}


Startup();