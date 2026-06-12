import useSWR from 'swr';
import { Card, Table } from 'react-bootstrap';
import PageHeader from '../components/PageHeader';
import RouteGuard from '../components/RouteGuard';
import { EmptyMessage, ErrorMessage, LoadingMessage } from '../components/StateMessage';
import { formatCalories, formatMacro } from '../lib/formatNutrition';

export default function WeeklyHistory() {
  const { data: logs, error } = useSWR('/api/tracker/week');

  return <RouteGuard>
    <PageHeader title="Weekly History" text="The last seven days of nutrition logs." />
    {error && <ErrorMessage text="Failed to load weekly history." />}
    {!logs && !error && <LoadingMessage text="Loading weekly history..." />}
    {logs && logs.length === 0 && <EmptyMessage text="No logs yet for this week." />}
    {logs && logs.length > 0 && <Card className="page-card p-4 weekly-history-card">
      <div className="weekly-history-table-wrap">
        <Table responsive hover className="weekly-history-table"><thead><tr><th>Date</th><th>Calories</th><th>Protein</th><th>Carbs</th><th>Fats</th><th>Meals</th></tr></thead><tbody>
          {logs.map(log => <tr key={log._id}><td>{log.date}</td><td>{formatCalories(log.totalCalories)}</td><td>{formatMacro(log.totalProtein)}g</td><td>{formatMacro(log.totalCarbs)}g</td><td>{formatMacro(log.totalFats)}g</td><td>{log.meals.length}</td></tr>)}
        </tbody></Table>
      </div>
      <div className="weekly-history-mobile-list">
        {logs.map(log => (
          <div className="weekly-history-mobile-card" key={`${log._id}-mobile`}>
            <div>
              <strong>{log.date}</strong>
              <span>{log.meals.length} meal{log.meals.length === 1 ? '' : 's'}</span>
            </div>
            <div className="weekly-history-mobile-stats">
              <span>{formatCalories(log.totalCalories)} cal</span>
              <span>{formatMacro(log.totalProtein)}g protein</span>
              <span>{formatMacro(log.totalCarbs)}g carbs</span>
              <span>{formatMacro(log.totalFats)}g fats</span>
            </div>
          </div>
        ))}
      </div>
    </Card>}
  </RouteGuard>;
}
