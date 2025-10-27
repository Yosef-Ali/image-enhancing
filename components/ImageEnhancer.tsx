import React, { useState, useRef, useEffect } from 'react';
import { enhanceImage, removeObjectFromImage } from '../services/geminiService';
import { fileToBase64 } from '../utils';
import { SparklesIcon, ImageIcon, DownloadIcon, TrashIcon, PlusIcon, MinusIcon, ArrowPathIcon, ArrowsRightLeftIcon } from './Icons';
import LoadingSpinner from './LoadingSpinner';

type Tool = 'enhance' | 'auto' | 'remove' | 'adjust';

interface Transform {
    scale: number;
    x: number;
    y: number;
}

const ImageEnhancer: React.FC = () => {
    const [originalImage, setOriginalImage] = useState<string | null>(null);
    const [enhancedImage, setEnhancedImage] = useState<string | null>(null);
    const [prompt, setPrompt] = useState<string>('Make this image more vibrant and cinematic.');
    const [isProcessing, setIsProcessing] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [tool, setTool] = useState<Tool>('enhance');
    const [brushSize, setBrushSize] = useState(30);
    const [isDrawing, setIsDrawing] = useState(false);
    
    // Adjustment states
    const [brightness, setBrightness] = useState(100);
    const [contrast, setContrast] = useState(100);
    const [saturation, setSaturation] = useState(100);
    const [sharpen, setSharpen] = useState(0);
    const [vibrance, setVibrance] = useState(100);
    const [temperature, setTemperature] = useState(100);
    
    const [transform, setTransform] = useState<Transform>({ scale: 1, x: 0, y: 0 });
    const [sliderPosition, setSliderPosition] = useState(50);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const imageRef = useRef<HTMLImageElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const panStateRef = useRef<{
        startX: number;
        startY: number;
        initialX: number;
        initialY: number;
    } | null>(null);

    // --- Zoom and Pan Logic ---
    const ZOOM_SENSITIVITY = 0.001;
    const MIN_SCALE = 1;
    const MAX_SCALE = 10;

    const resetTransform = () => {
        setTransform({ scale: 1, x: 0, y: 0 });
    };

    useEffect(() => {
        const onMouseMove = (e: MouseEvent) => {
            if (!panStateRef.current) return;
            
            const panState = panStateRef.current;
            const dx = e.clientX - panState.startX;
            const dy = e.clientY - panState.startY;

            const newX = panState.initialX + dx;
            const newY = panState.initialY + dy;

            setTransform(prev => ({ ...prev, x: newX, y: newY }));
        };

        const onMouseUp = () => {
            if (panStateRef.current) {
                document.body.style.cursor = 'default';
                panStateRef.current = null;
            }
        };

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);

        return () => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
            document.body.style.cursor = 'default';
        };
    }, []);

    const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
        e.preventDefault();
        const delta = -e.deltaY * ZOOM_SENSITIVITY;
        const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, transform.scale + delta * transform.scale));
        
        if (newScale === transform.scale) return;
        
        setTransform(prev => ({...prev, scale: newScale}));
    };

    const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
        if (e.button !== 0) return; // Only pan with left click
        if (transform.scale <= 1) return; // Only allow panning if zoomed in
        
        e.preventDefault();
        panStateRef.current = {
            startX: e.clientX,
            startY: e.clientY,
            initialX: transform.x,
            initialY: transform.y,
        };
        document.body.style.cursor = 'grabbing';
    };

    const handleZoom = (direction: 'in' | 'out') => {
        const zoomFactor = direction === 'in' ? 1.2 : 1 / 1.2;
        const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, transform.scale * zoomFactor));
        setTransform(prev => ({ ...prev, scale: newScale }));
    };
    
    const resetAllAdjustments = () => {
        setBrightness(100);
        setContrast(100);
        setSaturation(100);
        setSharpen(0);
        setVibrance(100);
        setTemperature(100);
    };

    // --- Component Logic ---
    const syncCanvasSize = () => {
        if (canvasRef.current && imageRef.current) {
            canvasRef.current.width = imageRef.current.clientWidth;
            canvasRef.current.height = imageRef.current.clientHeight;
        }
    };

    useEffect(() => {
        if (tool === 'remove' && originalImage) {
           syncCanvasSize();
        }
    }, [tool, originalImage]);
    
    useEffect(() => {
        if (tool !== 'adjust') {
            resetAllAdjustments();
        }
    }, [tool]);

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setImageFile(file);
            setOriginalImage(URL.createObjectURL(file));
            setEnhancedImage(null);
            setError(null);
            clearCanvas();
            resetAllAdjustments();
            resetTransform();
            setSliderPosition(50);
        }
    };
    
    const clearCanvas = () => {
        if (canvasRef.current) {
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');
            ctx?.clearRect(0, 0, canvas.width, canvas.height);
        }
    };
    
    const getButtonText = () => {
        if (isProcessing) {
            switch(tool) {
                case 'enhance': return 'Enhancing...';
                case 'auto': return 'Enhancing...';
                case 'remove': return 'Removing...';
                case 'adjust': return 'Applying...';
            }
        }
        switch(tool) {
            case 'enhance': return 'Enhance';
            case 'auto': return 'Auto Enhance';
            case 'remove': return 'Remove Object';
            case 'adjust': return 'Apply Adjustments';
        }
    }

    const handleSubmit = async () => {
        if (!imageFile) {
            setError('Please upload an image first.');
            return;
        }

        setIsProcessing(true);
        setError(null);
        setEnhancedImage(null);
        setSliderPosition(50);

        try {
            const base64Image = await fileToBase64(imageFile);
            let enhancedBase64: string;

            if (tool === 'remove') {
                if (!canvasRef.current) throw new Error("Canvas not found");
                const maskBase64 = canvasRef.current.toDataURL('image/png');
                enhancedBase64 = await removeObjectFromImage(base64Image, imageFile.type, maskBase64);
            } else {
                 let enhancementPrompt: string | undefined = prompt;

                 if (tool === 'auto') {
                    enhancementPrompt = undefined;
                 } else if (tool === 'adjust') {
                    const adjustments = [];
                    if (brightness !== 100) adjustments.push(`set brightness to ${brightness}%`);
                    if (contrast !== 100) adjustments.push(`set contrast to ${contrast}%`);
                    if (saturation !== 100) adjustments.push(`set saturation to ${saturation}%`);
                    if (sharpen !== 0) adjustments.push(`increase sharpness by ${sharpen}%`);
                    if (vibrance !== 100) adjustments.push(`set vibrance to ${vibrance}%`);
                    if (temperature !== 100) {
                        const tempDesc = temperature > 100 
                            ? `${temperature - 100}% warmer` 
                            : `${100 - temperature}% cooler`;
                        adjustments.push(`adjust color temperature to be ${tempDesc}`);
                    }

                    if (adjustments.length === 0) {
                        setError("Please make some adjustments before applying.");
                        setIsProcessing(false);
                        return;
                    }
                    
                    enhancementPrompt = `Apply the following adjustments to the image: ${adjustments.join(', ')}. Ensure the result is high-quality and the changes are blended naturally.`;
                 } else { // 'enhance'
                    if (!prompt) {
                        setError('Please provide a prompt for enhancement.');
                        setIsProcessing(false);
                        return;
                    }
                 }
                enhancedBase64 = await enhanceImage(base64Image, imageFile.type, enhancementPrompt);
            }

            setEnhancedImage(`data:${imageFile.type};base64,${enhancedBase64}`);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred.');
            console.error("Error enhancing image:", err);
        } finally {
            setIsProcessing(false);
        }
    };
    
    const triggerFileInput = () => fileInputRef.current?.click();

    const handleDownload = () => {
        if (!enhancedImage) return;
        const link = document.createElement('a');
        link.href = enhancedImage;
        const mimeType = enhancedImage.split(':')[1].split(';')[0];
        const extension = mimeType.split('/')[1] || 'png';
        link.download = `gemini-enhanced-image-${Date.now()}.${extension}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // --- Canvas Drawing Handlers ---
    const startDrawing = ({ nativeEvent }: React.MouseEvent<HTMLCanvasElement>) => {
        const { offsetX, offsetY } = nativeEvent;
        const ctx = canvasRef.current?.getContext('2d');
        if (!ctx) return;
        ctx.beginPath();
        ctx.moveTo(offsetX, offsetY);
        setIsDrawing(true);
    };

    const stopDrawing = () => {
        const ctx = canvasRef.current?.getContext('2d');
        ctx?.closePath();
        setIsDrawing(false);
    };

    const draw = ({ nativeEvent }: React.MouseEvent<HTMLCanvasElement>) => {
        if (!isDrawing) return;
        const { offsetX, offsetY } = nativeEvent;
        const ctx = canvasRef.current?.getContext('2d');
        if (!ctx) return;
        ctx.lineTo(offsetX, offsetY);
        ctx.strokeStyle = 'white';
        ctx.lineWidth = brushSize;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();
    };
    
    const transformStyle = {
        transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
        transition: isDrawing ? 'none' : 'transform 0.1s ease-out',
    };

    return (
        <div className="flex flex-col h-full w-full max-w-7xl mx-auto bg-gray-800 rounded-lg shadow-2xl overflow-hidden p-4 md:p-8 text-gray-200">
            {/* Top controls */}
            <div className="flex flex-col lg:flex-row gap-4 mb-4 items-center">
                <button onClick={triggerFileInput} className="w-full lg:w-auto flex-shrink-0 bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 px-6 rounded-lg transition duration-300 flex items-center justify-center gap-2">
                    <ImageIcon className="w-6 h-6" />
                    {imageFile ? 'Change Image' : 'Upload Image'}
                </button>
                <input type="file" accept="image/*" onChange={handleImageUpload} ref={fileInputRef} className="hidden" />

                <div className="flex items-center gap-2 p-1 bg-gray-900 rounded-lg w-full lg:w-auto">
                    {(['enhance', 'auto', 'remove', 'adjust'] as Tool[]).map((t) => (
                        <button key={t} onClick={() => setTool(t)} className={`flex-1 capitalize px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${tool === t ? 'bg-indigo-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}>
                           {t.replace('-', ' ')}
                        </button>
                    ))}
                </div>

                <div className="flex-1 w-full">
                    {tool === 'enhance' && (
                        <input type="text" value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Describe the enhancement..." className="w-full bg-gray-700 border border-gray-600 rounded-lg px-5 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition duration-300" />
                    )}
                     {tool === 'remove' && (
                        <div className="flex items-center gap-4 bg-gray-700 rounded-lg px-4 py-2 w-full">
                           <label htmlFor="brush-size" className="text-sm font-medium text-gray-300 whitespace-nowrap">Brush Size:</label>
                           <input type="range" id="brush-size" min="5" max="100" value={brushSize} onChange={e => setBrushSize(parseInt(e.target.value, 10))} className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-indigo-500" />
                           <button onClick={clearCanvas} className="p-2 text-gray-400 hover:text-white hover:bg-gray-600 rounded-full"><TrashIcon className="w-5 h-5"/></button>
                        </div>
                    )}
                    {tool === 'adjust' && (
                        <div className="flex flex-col gap-3 bg-gray-700 rounded-lg px-4 py-3 w-full">
                             <div className="flex justify-between items-center mb-1">
                                <h4 className="text-sm font-medium text-gray-200">Adjustments</h4>
                                <button 
                                    onClick={resetAllAdjustments}
                                    className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors">
                                    Reset
                                </button>
                            </div>
                            <div className="grid grid-cols-1 xl:grid-cols-2 gap-x-6 gap-y-2">
                                <div className="flex items-center gap-3">
                                    <label htmlFor="brightness" className="text-sm text-gray-300 w-20">Brightness</label>
                                    <input id="brightness" type="range" min="0" max="200" value={brightness} onChange={(e) => setBrightness(parseInt(e.target.value, 10))} className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-indigo-500" />
                                    <span className="text-sm text-gray-400 w-12 text-center">{brightness}%</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <label htmlFor="contrast" className="text-sm text-gray-300 w-20">Contrast</label>
                                    <input id="contrast" type="range" min="0" max="200" value={contrast} onChange={(e) => setContrast(parseInt(e.target.value, 10))} className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-indigo-500" />
                                    <span className="text-sm text-gray-400 w-12 text-center">{contrast}%</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <label htmlFor="saturation" className="text-sm text-gray-300 w-20">Saturation</label>
                                    <input id="saturation" type="range" min="0" max="200" value={saturation} onChange={(e) => setSaturation(parseInt(e.target.value, 10))} className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-indigo-500" />
                                    <span className="text-sm text-gray-400 w-12 text-center">{saturation}%</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <label htmlFor="sharpen" className="text-sm text-gray-300 w-20">Sharpen</label>
                                    <input id="sharpen" type="range" min="0" max="100" value={sharpen} onChange={(e) => setSharpen(parseInt(e.target.value, 10))} className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-indigo-500" />
                                    <span className="text-sm text-gray-400 w-12 text-center">{sharpen}%</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <label htmlFor="vibrance" className="text-sm text-gray-300 w-20">Vibrance</label>
                                    <input id="vibrance" type="range" min="0" max="200" value={vibrance} onChange={(e) => setVibrance(parseInt(e.target.value, 10))} className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-indigo-500" />
                                    <span className="text-sm text-gray-400 w-12 text-center">{vibrance}%</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <label htmlFor="temperature" className="text-sm text-gray-300 w-20">Temperature</label>
                                    <input id="temperature" type="range" min="0" max="200" value={temperature} onChange={(e) => setTemperature(parseInt(e.target.value, 10))} className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-indigo-500" />
                                    <span className="text-sm text-gray-400 w-12 text-center">{temperature - 100}</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <button onClick={handleSubmit} disabled={isProcessing || !originalImage} className="w-full lg:w-auto flex-shrink-0 bg-indigo-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-indigo-500 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors duration-300 flex items-center justify-center gap-2">
                    {isProcessing ? <LoadingSpinner /> : <SparklesIcon className="w-6 h-6" />}
                    {getButtonText()}
                </button>
            </div>
            
            {error && <p className="text-red-400 text-center bg-red-900/20 p-3 rounded-lg mb-4">{error}</p>}

            {/* Image Display */}
            <div className="flex-1 flex flex-col w-full bg-gray-900/50 rounded-lg min-h-0">
                <div className="w-full flex justify-between items-center p-4">
                    <h3 className="text-lg font-semibold text-gray-400">
                        Image Viewer 
                        {tool === 'remove' && originalImage && !enhancedImage && <span className='text-sm font-normal'> - Draw mask to remove object</span>}
                    </h3>
                    <div className='flex items-center gap-4'>
                        {originalImage && (
                            <div className="flex items-center gap-1 p-1 bg-gray-700/50 rounded-full">
                                <button title="Zoom In" onClick={() => handleZoom('in')} className="p-1 text-gray-400 hover:text-white hover:bg-gray-600 rounded-full transition-colors"><PlusIcon className="w-5 h-5"/></button>
                                <button title="Zoom Out" onClick={() => handleZoom('out')} className="p-1 text-gray-400 hover:text-white hover:bg-gray-600 rounded-full transition-colors"><MinusIcon className="w-5 h-5"/></button>
                                <button title="Reset View" onClick={resetTransform} className="p-1 text-gray-400 hover:text-white hover:bg-gray-600 rounded-full transition-colors"><ArrowPathIcon className="w-5 h-5"/></button>
                            </div>
                        )}
                        {enhancedImage && !isProcessing && (
                            <button onClick={handleDownload} className="flex items-center gap-2 text-sm bg-green-600 hover:bg-green-500 text-white font-bold py-2 px-4 rounded-lg transition duration-300">
                                <DownloadIcon className="w-5 h-5" />
                                Download
                            </button>
                        )}
                    </div>
                </div>

                <div 
                    className={`relative flex-1 w-full h-full flex items-center justify-center overflow-hidden ${transform.scale > 1 ? 'cursor-grab' : 'cursor-auto'}`}
                    onWheel={handleWheel}
                    onMouseDown={handleMouseDown}
                >
                    {!originalImage && !isProcessing && (
                        <div className="text-center text-gray-500">
                           <ImageIcon className="w-20 h-20 mx-auto" />
                           <p>Upload an image to get started</p>
                        </div>
                    )}
                    {isProcessing && (
                        <div className="flex flex-col items-center justify-center text-gray-400">
                            <SparklesIcon className="w-20 h-20 animate-pulse text-indigo-400" />
                            <p className="mt-4">Gemini is working its magic...</p>
                        </div>
                    )}
                    {originalImage && !isProcessing && (
                        <div className="relative w-full h-full">
                           <img 
                                ref={imageRef} 
                                src={originalImage} 
                                alt="Original" 
                                onLoad={syncCanvasSize} 
                                className="absolute top-0 left-0 w-full h-full object-contain"
                                style={{
                                    ...transformStyle,
                                    filter: tool === 'adjust' ? `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)` : 'none',
                                }}
                            />
                            {enhancedImage && (
                                <img 
                                    src={enhancedImage} 
                                    alt="Enhanced" 
                                    className="absolute top-0 left-0 w-full h-full object-contain"
                                    style={{
                                        ...transformStyle,
                                        clipPath: `polygon(0 0, ${sliderPosition}% 0, ${sliderPosition}% 100%, 0 100%)`
                                    }}
                                />
                            )}
                            {tool === 'remove' && (
                                <canvas 
                                    ref={canvasRef} 
                                    className="absolute top-0 left-0 w-full h-full object-contain cursor-crosshair" 
                                    onMouseDown={startDrawing} 
                                    onMouseUp={stopDrawing} 
                                    onMouseOut={stopDrawing} 
                                    onMouseMove={draw} 
                                    style={transformStyle}
                                />
                            )}
                            {enhancedImage && (
                                <div className="absolute top-0 left-0 w-full h-full pointer-events-none" style={transformStyle}>
                                    <div className="absolute top-0 bottom-0 bg-white w-0.5" style={{ left: `calc(${sliderPosition}% - 1px)` }}>
                                        <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-10 w-10 rounded-full bg-white/70 backdrop-blur-sm flex items-center justify-center shadow-lg text-gray-700 cursor-ew-resize">
                                            <ArrowsRightLeftIcon className="w-6 h-6 -rotate-45" />
                                        </div>
                                    </div>
                                    <div className="absolute top-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded" style={{ opacity: sliderPosition > 10 ? 1 : 0}}>After</div>
                                    <div className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded" style={{ opacity: sliderPosition < 90 ? 1 : 0}}>Before</div>

                                </div>
                            )}
                        </div>
                    )}
                    {enhancedImage && (
                        <input
                            type="range"
                            min="0"
                            max="100"
                            value={sliderPosition}
                            onChange={(e) => setSliderPosition(Number(e.target.value))}
                            className="absolute top-0 left-0 w-full h-full m-0 cursor-ew-resize opacity-0"
                        />
                    )}
                </div>
            </div>
        </div>
    );
};

export default ImageEnhancer;