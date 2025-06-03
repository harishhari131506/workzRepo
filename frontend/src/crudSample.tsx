import React, { useState, useEffect } from 'react';
import { 
  GenericCrudEngine, 
  PgliteAdapter, 
  type QueryParams, 
  type QueryResult, 
  type StandardEntity,
  type CrudEngineConfig,
  createStandardTable
} from '../../lib';

// Mock PgLite database for demonstration
// In real usage, you would import and initialize PgLite
const mockPgLiteDb = {
  select: () => ({ from: () => ({ where: () => Promise.resolve([]) }) }),
  insert: (table:any) => ({ 
    values: (data:any) => ({ 
      returning: () => Promise.resolve([{ 
        wid: Math.floor(Math.random() * 1000),
        ...data,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null
      }]) 
    }) 
  }),
  update: () => ({ set: () => ({ where: () => ({ returning: () => Promise.resolve([]) }) }) })
};

interface User extends StandardEntity {
  email?: string;
  role?: string;
}

export default function CrudFrontend() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'user'
  });

  // Initialize CRUD engine
  const [crudEngine, setCrudEngine] = useState<GenericCrudEngine<User> | null>(null);

  useEffect(() => {
    // Initialize the CRUD engine
    const adapter = new PgliteAdapter(mockPgLiteDb as any);
    const usersTable = createStandardTable('users');
    
    const config: CrudEngineConfig = {
      database: adapter,
      idGenerator: () => `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };

    const engine = new GenericCrudEngine<User>(usersTable, 'User', config);
    setCrudEngine(engine);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!crudEngine) {
      setError('CRUD engine not initialized');
      return;
    }

    if (!formData.name.trim()) {
      setError('Name is required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const userData = {
        name: formData.name,
        data: {
          email: formData.email,
          role: formData.role,
          profile: {
            preferences: {
              theme: 'light',
              notifications: true
            }
          }
        },
        updated_at: new Date()
      };

      const newUser = await crudEngine.create(userData);
      
      setUsers(prev => [...prev, newUser]);
      setFormData({ name: '', email: '', role: 'user' });
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Create user error:', err);
    } finally {
      setLoading(false);
    }
  };

  const clearUsers = () => {
    setUsers([]);
  };

  return (
    <div className="max-w-7xl mx-auto p-6 bg-gray-50 min-h-screen">
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">CRUD Frontend Demo</h1>
        <p className="text-gray-600">Using GenericCrudEngine with PgLite Adapter</p>
      </div>

      {/* Create User Form */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Create New User</h2>
        
        <form onSubmit={handleCreateUser} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Name *
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter user name"
                required
              />
            </div>
            
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter email address"
              />
            </div>
          </div>

          <div>
            <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
              Role
            </label>
            <select
              id="role"
              name="role"
              value={formData.role}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="user">User</option>
              <option value="admin">Admin</option>
              <option value="moderator">Moderator</option>
            </select>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2 px-4 rounded-md transition-colors duration-200"
          >
            {loading ? 'Creating...' : 'Create User'}
          </button>
        </form>
      </div>

      {/* Users List */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-800">Created Users ({users.length})</h2>
          {users.length > 0 && (
            <button
              onClick={clearUsers}
              className="bg-gray-500 hover:bg-gray-600 text-white font-medium py-2 px-4 rounded-md transition-colors duration-200"
            >
              Clear All
            </button>
          )}
        </div>

        {users.length === 0 ? (
          <div className="text-gray-500 text-center py-8">
            No users created yet. Use the form above to create your first user.
          </div>
        ) : (
          <div className="space-y-3">
            {users.map((user, index) => (
              <div key={user.id || index} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">{user.name}</h3>
                    <p className="text-sm text-gray-600">ID: {user.id}</p>
                    {user.data?.email && (
                      <p className="text-sm text-gray-600">Email: {user.data.email}</p>
                    )}
                    {user.data?.role && (
                      <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full mt-1">
                        {user.data.role}
                      </span>
                    )}
                  </div>
                  <div className="text-right text-xs text-gray-500">
                    <p>WID: {user.wid}</p>
                    <p>Created: {user.created_at?.toLocaleString()}</p>
                  </div>
                </div>
                
                {user.data && Object.keys(user.data).length > 0 && (
                  <details className="mt-3">
                    <summary className="text-sm text-gray-600 cursor-pointer hover:text-gray-800">
                      View JSON Data
                    </summary>
                    <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto max-h-32">
                      {JSON.stringify(user.data, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}