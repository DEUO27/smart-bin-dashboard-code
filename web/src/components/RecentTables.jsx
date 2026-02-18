import React from 'react';

const Table = ({ title, columns, data }) => (
    <div className="bg-white p-4 rounded-lg shadow-md overflow-x-auto">
        <h3 className="text-lg font-semibold mb-4">{title}</h3>
        <table className="min-w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-700 uppercase">
                <tr>
                    {columns.map(col => <th key={col} className="px-4 py-2">{col}</th>)}
                </tr>
            </thead>
            <tbody>
                {data.map((row, i) => (
                    <tr key={i} className="border-b hover:bg-gray-50">
                        {columns.map(col => (
                            <td key={col} className="px-4 py-2 whitespace-nowrap">
                                {row[col.toLowerCase()] || row[col] || '-'}
                            </td>
                        ))}
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
);

export const RecentMediciones = ({ data }) => (
    <Table
        title="Últimas Mediciones"
        columns={['TS', 'ID_Bote', 'Tipo_Sensor', 'Valores']}
        data={data}
    />
);

export const RecentEventos = ({ data }) => (
    <Table
        title="Últimos Eventos"
        columns={['TS', 'ID_Bote', 'Tipo_Actuador', 'Descp']}
        data={data}
    />
);

export const RecentRecolecciones = ({ data }) => (
    <Table
        title="Últimas Recolecciones"
        columns={['TS', 'ID_Bote', 'Peso_Recolectado_Kg']}
        data={data}
    />
);
