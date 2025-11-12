import React, { useState, useEffect } from 'react';
import { Download, Trash2, PlusCircle, Settings, CheckCircle } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function ExpenseTracker() {
  const [expenses, setExpenses] = useState([]);
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Food');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [showSettings, setShowSettings] = useState(false);
  const [webAppUrl, setWebAppUrl] = useState('');
  const [syncStatus, setSyncStatus] = useState('');

  // Load expenses and settings from storage on mount
  useEffect(() => {
    loadExpenses();
    loadSettings();
  }, []);

  // Save expenses to storage whenever they change
  useEffect(() => {
    if (expenses.length > 0) {
      saveExpenses();
    }
  }, [expenses]);

  const loadExpenses = async () => {
    try {
      const result = await window.storage.get('expenses');
      if (result) {
        setExpenses(JSON.parse(result.value));
      }
    } catch (error) {
      console.log('No existing expenses found');
    }
  };

  const saveExpenses = async () => {
    try {
      await window.storage.set('expenses', JSON.stringify(expenses));
    } catch (error) {
      console.error('Error saving expenses:', error);
    }
  };

  const loadSettings = async () => {
    try {
      const result = await window.storage.get('google-sheets-url');
      if (result) {
        setWebAppUrl(result.value);
      }
    } catch (error) {
      console.log('No Google Sheets URL found');
    }
  };

  const saveSettings = async () => {
    try {
      await window.storage.set('google-sheets-url', webAppUrl);
      setSyncStatus('Settings saved!');
      setTimeout(() => setSyncStatus(''), 3000);
    } catch (error) {
      console.error('Error saving settings:', error);
      setSyncStatus('Error saving settings');
    }
  };

  const categories = [
    'Food',
    'Transportation',
    'Shopping',
    'Entertainment',
    'Bills',
    'Healthcare',
    'Education',
    'Other'
  ];

  const syncToGoogleSheets = async (expense) => {
    if (!webAppUrl) {
      setSyncStatus('Please configure Google Sheets URL in settings');
      return false;
    }

    try {
      setSyncStatus('Syncing to Google Sheets...');
      const response = await fetch(webAppUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          date: expense.date,
          category: expense.category,
          description: expense.description,
          amount: expense.amount
        })
      });

      setSyncStatus('✓ Synced to Google Sheets!');
      setTimeout(() => setSyncStatus(''), 3000);
      return true;
    } catch (error) {
      console.error('Error syncing to Google Sheets:', error);
      setSyncStatus('Error syncing. Check your URL.');
      setTimeout(() => setSyncStatus(''), 5000);
      return false;
    }
  };

  const addExpense = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    const newExpense = {
      id: Date.now(),
      date,
      amount: parseFloat(amount),
      category,
      description: description.trim() || '-'
    };

    setExpenses([newExpense, ...expenses]);
    
    // Sync to Google Sheets
    if (webAppUrl) {
      await syncToGoogleSheets(newExpense);
    }

    setAmount('');
    setDescription('');
    setDate(new Date().toISOString().split('T')[0]);
  };

  const deleteExpense = (id) => {
    setExpenses(expenses.filter(exp => exp.id !== id));
  };

  const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);

  const exportToExcel = () => {
    const data = expenses.map(exp => ({
      Date: exp.date,
      Category: exp.category,
      Description: exp.description,
      Amount: exp.amount
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Expenses');
    
    ws['!cols'] = [
      { wch: 12 },
      { wch: 15 },
      { wch: 30 },
      { wch: 10 }
    ];

    XLSX.writeFile(wb, `expenses_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-100 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <div className="flex justify-between items-center mb-2">
            <h1 className="text-3xl font-bold text-gray-800">Personal Expense Tracker</h1>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 hover:bg-gray-100 rounded-lg transition"
            >
              <Settings size={24} className="text-gray-600" />
            </button>
          </div>
          <p className="text-gray-600 mb-4">Track your daily expenses and sync to Google Sheets</p>
          
          {/* Google Sheets Settings */}
          {showSettings && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <h3 className="font-semibold text-gray-800 mb-3">Google Sheets Integration</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Google Apps Script Web App URL
                  </label>
                  <input
                    type="text"
                    value={webAppUrl}
                    onChange={(e) => setWebAppUrl(e.target.value)}
                    placeholder="https://script.google.com/macros/s/YOUR_ID/exec"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>
                <button
                  onClick={saveSettings}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 transition"
                >
                  Save Settings
                </button>
                <div className="text-sm text-gray-600 mt-3 space-y-1">
                  <p className="font-semibold">Setup Instructions:</p>
                  <ol className="list-decimal ml-5 space-y-1">
                    <li>Open your Google Sheet</li>
                    <li>Go to Extensions → Apps Script</li>
                    <li>Paste the provided script (see below)</li>
                    <li>Click Deploy → New deployment</li>
                    <li>Select "Web app" type</li>
                    <li>Set "Execute as" to yourself and "Who has access" to Anyone</li>
                    <li>Copy the Web App URL and paste it above</li>
                  </ol>
                </div>
              </div>
            </div>
          )}

          {/* Sync Status */}
          {syncStatus && (
            <div className={`p-3 rounded-lg mb-4 ${syncStatus.includes('✓') ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
              <p className="text-sm font-medium">{syncStatus}</p>
            </div>
          )}
          
          {/* Total Display */}
          <div className="bg-gradient-to-r from-orange-500 to-red-600 rounded-xl p-6 text-white mb-6">
            <p className="text-sm opacity-90 mb-1">Total Expenses</p>
            <p className="text-4xl font-bold">₹{totalExpenses.toFixed(2)}</p>
            <p className="text-sm opacity-75 mt-2">{expenses.length} transactions</p>
          </div>

          {/* Add Expense Form */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Amount (₹)</label>
              <input
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={addExpense}
              className="flex-1 bg-orange-600 text-white py-3 rounded-lg font-semibold hover:bg-orange-700 transition flex items-center justify-center gap-2"
            >
              <PlusCircle size={20} />
              Add Expense
            </button>
            
            <button
              onClick={exportToExcel}
              disabled={expenses.length === 0}
              className="bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download size={20} />
              Export
            </button>
          </div>
        </div>

        {/* Expense List */}
        <div className="bg-white rounded-2xl shadow-xl p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Recent Expenses</h2>
          
          {expenses.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <p className="text-lg">No expenses yet</p>
              <p className="text-sm">Add your first expense to get started</p>
            </div>
          ) : (
            <div className="space-y-3">
              {expenses.map(exp => (
                <div key={exp.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="text-sm font-medium text-gray-500">{exp.date}</span>
                      <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-medium">
                        {exp.category}
                      </span>
                    </div>
                    <p className="text-gray-700">{exp.description}</p>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <span className="text-lg font-bold text-gray-800">₹{exp.amount.toFixed(2)}</span>
                    <button
                      onClick={() => deleteExpense(exp.id)}
                      className="text-red-500 hover:text-red-700 transition p-2"
                      title="Delete expense"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Google Apps Script Code */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mt-6">
          <h3 className="text-lg font-bold text-gray-800 mb-3">Google Apps Script Code</h3>
          <p className="text-sm text-gray-600 mb-3">Copy this code to your Google Apps Script:</p>
          <pre className="bg-gray-900 text-green-400 p-4 rounded-lg text-xs overflow-x-auto">
{`function doPost(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  
  // Parse the JSON data
  var data = JSON.parse(e.postData.contents);
  
  // Add a new row with the expense data
  sheet.appendRow([
    data.date,
    data.category,
    data.description,
    data.amount
  ]);
  
  return ContentService.createTextOutput(JSON.stringify({
    'status': 'success'
  })).setMimeType(ContentService.MimeType.JSON);
}`}
          </pre>
        </div>
      </div>
    </div>
  );
}