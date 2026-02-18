import React from 'react';

const DeviceStatus = ({ type, lastSeen }) => {
    const isActive = lastSeen && (new Date() - new Date(lastSeen) < 5 * 60 * 1000); // 5 minutes
    const statusColor = isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800';
    const statusDot = isActive ? 'bg-green-500' : 'bg-gray-400';

    return (
        <div className="flex justify-between items-center py-2 border-b last:border-0">
            <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${statusDot}`}></div>
                <span className="text-sm font-medium capitalize text-gray-700">{type}</span>
            </div>
            <div className="text-right">
                <span className={`px-2 py-0.5 rounded-full text-xs ${statusColor}`}>
                    {isActive ? 'Activo' : 'Inactivo'}
                </span>
                <div className="text-[10px] text-gray-400 mt-0.5">
                    {lastSeen ? new Date(lastSeen).toLocaleTimeString() : '-'}
                </div>
            </div>
        </div>
    );
};

const BoatCard = ({ boat }) => {
    return (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="bg-green-600 px-4 py-3">
                <h3 className="text-white font-bold text-lg">{boat.nombre}</h3>
                <p className="text-green-100 text-xs">ID: {boat.id_bote}</p>
            </div>
            <div className="p-4">
                <div className="mb-4">
                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Sensores</h4>
                    {boat.sensors.length > 0 ? (
                        boat.sensors.map((s, idx) => (
                            <DeviceStatus key={idx} type={s.tipo} lastSeen={s.last_seen} />
                        ))
                    ) : (
                        <p className="text-sm text-gray-400 italic">Sin sensores</p>
                    )}
                </div>

                <div>
                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Actuadores</h4>
                    {boat.actuators.length > 0 ? (
                        boat.actuators.map((a, idx) => (
                            <DeviceStatus key={idx} type={a.tipo} lastSeen={a.last_seen} />
                        ))
                    ) : (
                        <p className="text-sm text-gray-400 italic">Sin actuadores</p>
                    )}
                </div>
            </div>
        </div>
    );
};

const StatusCards = ({ boatStatus }) => {
    if (!boatStatus || boatStatus.length === 0) {
        return <div className="text-gray-500 text-center py-8">No hay información de botes disponible.</div>;
    }

    return (
        <div>
            <h2 className="text-xl font-bold mb-4 text-gray-800">Estado por Bote</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {boatStatus.map((boat) => (
                    <BoatCard key={boat.id_bote} boat={boat} />
                ))}
            </div>
        </div>
    );
};

export default StatusCards;
