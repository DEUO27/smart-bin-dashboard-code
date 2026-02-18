import React, { useState, useEffect } from 'react';

const CollectionForm = ({ onCollectionAdded }) => {
    const [botes, setBotes] = useState([]);
    const [selectedBote, setSelectedBote] = useState('');
    const [peso, setPeso] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState(null);

    useEffect(() => {
        fetch('/api/botes')
            .then(res => res.json())
            .then(data => setBotes(data))
            .catch(err => console.error(err));
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!selectedBote || !peso) return;

        setLoading(true);
        setMessage(null);

        try {
            const res = await fetch('/api/recolecciones', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id_bote: parseInt(selectedBote),
                    peso_recolectado_kg: parseFloat(peso),
                    ts: new Date().toISOString()
                })
            });

            if (!res.ok) throw new Error('Error al registrar');

            setMessage({ type: 'success', text: 'Recolección registrada correctamente' });
            setPeso('');
            setSelectedBote('');
            if (onCollectionAdded) onCollectionAdded();
        } catch (error) {
            setMessage({ type: 'error', text: 'Error al registrar la recolección' });
        } finally {
            setLoading(false);
            setTimeout(() => setMessage(null), 3000);
        }
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-bold mb-4 text-gray-800">Registrar Recolección</h2>

            {message && (
                <div className={`p-2 mb-4 rounded text-sm ${message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {message.text}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Bote</label>
                    <select
                        className="w-full border rounded p-2 focus:ring-2 focus:ring-green-500 outline-none"
                        value={selectedBote}
                        onChange={(e) => setSelectedBote(e.target.value)}
                        required
                    >
                        <option value="">Seleccionar Bote</option>
                        {botes.map(bote => (
                            <option key={bote.id_bote} value={bote.id_bote}>
                                {bote.nombre} (ID: {bote.id_bote})
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Peso (kg)</label>
                    <input
                        type="number"
                        step="0.1"
                        className="w-full border rounded p-2 focus:ring-2 focus:ring-green-500 outline-none"
                        value={peso}
                        onChange={(e) => setPeso(e.target.value)}
                        placeholder="Ej: 5.2"
                        required
                    />
                </div>

                <button
                    type="submit"
                    disabled={loading || !selectedBote || !peso}
                    className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700 disabled:bg-gray-400 transition-colors"
                >
                    {loading ? 'Registrando...' : 'Registrar Recolección'}
                </button>
            </form>
        </div>
    );
};

export default CollectionForm;
