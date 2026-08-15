'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Protect } from '@/components/Protect';

interface LogItem {
  id: string;
  action: string;
  table_name: string;
  description: string;
  user_name: string;
  created_at: string;
}

export function AuditLogTab() {
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLogs() {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (!error && data) {
        setLogs(data);
      }
      setLoading(false);
    }

    fetchLogs();
  }, []);

  if (loading) return <div className="p-8 text-center text-gray-500">טוען יומן פעילות...</div>;

  return (
    <Protect permId="manage_users">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-4">יומן פעילות מערכת (Audit Log)</h2>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">תאריך ושעה</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">בוצע על ידי</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">פעולה</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">טבלה</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">תיאור</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(log.created_at).toLocaleString('he-IL')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-purple-700">
                    {log.user_name || 'לא ידוע'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                    {log.action}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {log.table_name}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-800">
                    {log.description}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Protect>
  );
}