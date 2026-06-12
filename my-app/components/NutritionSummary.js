import { Table } from 'react-bootstrap';
import { formatCalories, formatMacro } from '../lib/formatNutrition';

export default function NutritionSummary({ item }) {
  const values = [
    ['Calories', item?.totalCalories ?? item?.calories ?? 0],
    ['Protein', item?.totalProtein ?? item?.protein ?? 0, 'g'],
    ['Carbs', item?.totalCarbs ?? item?.carbs ?? 0, 'g'],
    ['Fats', item?.totalFats ?? item?.fats ?? 0, 'g'],
    ['Sugar', item?.totalSugar ?? item?.sugar ?? 0, 'g']
  ];

  return (
    <div className="page-card nutrition-table-card">
      <Table responsive className="nutrition-table">
        <thead>
          <tr>{values.map(([label]) => <th key={label}>{label}</th>)}</tr>
        </thead>
        <tbody>
          <tr>
            {values.map(([label, value, unit]) => (
              <td key={label}>{label === 'Calories' ? formatCalories(value) : formatMacro(value)}{unit || ''}</td>
            ))}
          </tr>
        </tbody>
      </Table>
    </div>
  );
}
