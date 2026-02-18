import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';

export const SensorChart = ({ data }) => (
    <div className="bg-white p-4 rounded-lg shadow-md h-80">
        <h3 className="text-lg font-semibold mb-4">Sensores por Tipo</h3>
        <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="tipo" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="total" fill="#8884d8" name="Cantidad" />
            </BarChart>
        </ResponsiveContainer>
    </div>
);

export const ActuatorChart = ({ data }) => (
    <div className="bg-white p-4 rounded-lg shadow-md h-80">
        <h3 className="text-lg font-semibold mb-4">Actuadores por Tipo</h3>
        <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="tipo" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="total" fill="#82ca9d" name="Cantidad" />
            </BarChart>
        </ResponsiveContainer>
    </div>
);

export const MeasurementChart = ({ data, hours, setHours }) => (
    <div className="bg-white p-4 rounded-lg shadow-md h-96">
        <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Mediciones por Hora</h3>
            <select
                value={hours}
                onChange={(e) => setHours(Number(e.target.value))}
                className="border rounded p-1"
            >
                <option value={6}>Últimas 6 horas</option>
                <option value={24}>Últimas 24 horas</option>
                <option value={72}>Últimas 72 horas</option>
            </select>
        </div>
        <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="bucket" tickFormatter={(str) => str ? str.substring(11, 16) : ''} />
                <YAxis />
                <Tooltip labelFormatter={(label) => new Date(label).toLocaleString()} />
                <Legend />
                <Line type="monotone" dataKey="total" stroke="#ff7300" name="Mediciones" />
            </LineChart>
        </ResponsiveContainer>
    </div>
);
