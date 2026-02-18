import React, { useState, useEffect } from 'react';

const RouteBuilder = () => {
    const [botes, setBotes] = useState([]);
    const [selectedBotes, setSelectedBotes] = useState([]);
    const [origin, setOrigin] = useState('');
    const [destination, setDestination] = useState('');
    const [optimize, setOptimize] = useState(false);
    const [generatedUrl, setGeneratedUrl] = useState('');

    useEffect(() => {
        fetch('/api/botes')
            .then(res => res.json())
            .then(data => setBotes(data))
            .catch(err => console.error(err));
    }, []);

    const handleCheckboxChange = (id) => {
        if (selectedBotes.includes(id)) {
            setSelectedBotes(selectedBotes.filter(b => b !== id));
            if (origin == id) setOrigin('');
            if (destination == id) setDestination('');
        } else {
            setSelectedBotes([...selectedBotes, id]);
        }
    };

    const generateRoute = () => {
        if (!origin || !destination) return;

        const originBote = botes.find(b => b.id_bote === parseInt(origin));
        const destBote = botes.find(b => b.id_bote === parseInt(destination));

        if (!originBote || !destBote) return;

        let url = 'https://www.google.com/maps/dir/?api=1';
        url += `&origin=${originBote.latitud},${originBote.longitud}`;
        url += `&destination=${destBote.latitud},${destBote.longitud}`;
        url += '&travelmode=driving';

        const waypoints = selectedBotes
            .filter(id => id !== parseInt(origin) && id !== parseInt(destination))
            .map(id => {
                const b = botes.find(bote => bote.id_bote === id);
                return `${b.latitud},${b.longitud}`;
            });

        if (waypoints.length > 0) {
            url += `&waypoints=${optimize ? 'optimize:true|' : ''}${waypoints.join('|')}`;
        }

        setGeneratedUrl(url);
    };

    const openMap = () => {
        if (generatedUrl) window.open(generatedUrl, '_blank');
    };

    const copyUrl = () => {
        navigator.clipboard.writeText(generatedUrl);
        alert('URL copiado!');
    };

    const selectedBoteObjects = botes.filter(b => selectedBotes.includes(b.id_bote));

    return (
        <div className="bg-white p-6 rounded-lg shadow-md mt-6">
            <h2 className="text-xl font-bold mb-4">Generador de Rutas (Google Maps)</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <h3 className="font-semibold mb-2">Seleccionar Botes</h3>
                    <div className="max-h-60 overflow-y-auto border rounded p-2">
                        {botes.length === 0 && <p className="text-gray-500 text-sm">Cargando botes...</p>}
                        {botes.map(bote => (
                            <div key={bote.id_bote} className="flex items-center space-x-2 mb-1">
                                <input
                                    type="checkbox"
                                    checked={selectedBotes.includes(bote.id_bote)}
                                    onChange={() => handleCheckboxChange(bote.id_bote)}
                                />
                                <span>{bote.nombre} (ID: {bote.id_bote})</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium">Origen</label>
                        <select
                            className="w-full border rounded p-2"
                            value={origin}
                            onChange={(e) => setOrigin(e.target.value)}
                            disabled={selectedBotes.length < 2}
                        >
                            <option value="">Seleccionar Origen</option>
                            {selectedBoteObjects.map(b => (
                                <option key={b.id_bote} value={b.id_bote}>{b.nombre}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium">Destino</label>
                        <select
                            className="w-full border rounded p-2"
                            value={destination}
                            onChange={(e) => setDestination(e.target.value)}
                            disabled={selectedBotes.length < 2}
                        >
                            <option value="">Seleccionar Destino</option>
                            {selectedBoteObjects.map(b => (
                                <option key={b.id_bote} value={b.id_bote}>{b.nombre}</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex items-center space-x-2">
                        <input
                            type="checkbox"
                            checked={optimize}
                            onChange={(e) => setOptimize(e.target.checked)}
                        />
                        <span>Optimizar Ruta</span>
                    </div>

                    <button
                        onClick={generateRoute}
                        disabled={selectedBotes.length < 2 || !origin || !destination}
                        className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700 disabled:bg-gray-400"
                    >
                        Generar URL
                    </button>
                </div>
            </div>

            {generatedUrl && (
                <div className="mt-4 p-4 bg-gray-50 rounded border">
                    <div className="flex space-x-2 mb-2">
                        <input
                            type="text"
                            readOnly
                            value={generatedUrl}
                            className="flex-1 border rounded p-2 text-sm text-gray-600"
                        />
                        <button onClick={copyUrl} className="bg-gray-200 px-4 rounded hover:bg-gray-300">Copiar</button>
                    </div>
                    <button onClick={openMap} className="text-green-600 hover:underline font-medium">
                        Abrir en Google Maps ↗
                    </button>
                </div>
            )}
        </div>
    );
};

export default RouteBuilder;
