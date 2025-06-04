import React, { useState, useEffect } from 'react';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { 
  pgTable, 
  serial, 
  varchar, 
  jsonb, 
  timestamp, 
  index 
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
// Import your CRUD library
import { GenericCrudEngine, PgliteAdapter, DefaultLogger, generateXid, type StandardEntity ,createStandardTable} from '../../lib/index';


const usersTable = createStandardTable('users');

const UserCRUD = () => {
const [usersCrud, setUsersCrud] = useState<GenericCrudEngine<StandardEntity> | null>(null);

  const [userList, setUserList] = useState([]);
  const [formData, setFormData] = useState({ 
    name: '', 
    email: '', 
    age: '', 
    phone: '',
    address: '' 
  });
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [queryParams, setQueryParams] = useState({
    page: 1,
    limit: 10,
    sort: 'desc_created_at'
  });
  const [totalCount, setTotalCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');

  // Initialize database and CRUD engine
  useEffect(() => {
    const initDB = async () => {
      try {
        const client = new PGlite({
          dataDir: 'idb://user-database'
        });
        
        await client.waitReady;
        
        const database = drizzle(client);
        
        // Create table if it doesn't exist
        await client.exec(`
          CREATE TABLE IF NOT EXISTS users (
            wid SERIAL PRIMARY KEY,
            id VARCHAR(255) NOT NULL UNIQUE,
            name VARCHAR(255) NOT NULL,
            data JSONB DEFAULT '{}' NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
            deleted_at TIMESTAMP WITH TIME ZONE
          );
          
          CREATE INDEX IF NOT EXISTS users_id_idx ON users(id);
          CREATE INDEX IF NOT EXISTS users_name_idx ON users(name);
          CREATE INDEX IF NOT EXISTS users_created_at_idx ON users(created_at);
          CREATE INDEX IF NOT EXISTS users_updated_at_idx ON users(updated_at);
          CREATE INDEX IF NOT EXISTS users_deleted_at_idx ON users(deleted_at);
        `);
        
        // Initialize PgliteAdapter and CrudEngine
        const pgliteAdapter = new PgliteAdapter(database as any);
        const crudEngine = new GenericCrudEngine(
          usersTable,
          'User',
          { 
            database: pgliteAdapter,
            logger: new DefaultLogger(),
            idGenerator: generateXid
          }
        );
        
        setUsersCrud(crudEngine);
        setLoading(false);
        console.log('Database and CRUD engine initialized with IndexedDB persistence');
        
      } catch (err:any) {
        console.error(err);
        setError('Failed to initialize database: ' + err.message);
        setLoading(false);
      }
    };
    
    initDB();
  }, []);

  // Load users using CRUD engine
  const loadUsers = async (params = queryParams) => {
    if (!usersCrud) return;
    
    try {
      const searchParams = { ...params };
      
      // Add search filter if search term exists
      if (searchTerm) {
        searchParams.substr_name = searchTerm;
      }
      
      const result = await usersCrud.findMany(searchParams);
      setUserList(result.records);
      setTotalCount(result.record_count);
    } catch (err:any) {
      setError('Failed to load users: ' + err.message);
    }
  };

  // Load users when CRUD engine is ready or query params change
  useEffect(() => {
    if (usersCrud) {
      loadUsers();
    }
  }, [usersCrud, queryParams, searchTerm]);

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Create new user using CRUD engine
  const createUser = async () => {
    if (!usersCrud || !formData.name) {
      setError('Name is required');
      return;
    }

    try {
      const userData = {
        name: formData.name,
        data: {
          email: formData.email || null,
          age: formData.age ? parseInt(formData.age) : null,
          phone: formData.phone || null,
          address: formData.address || null
        }
      };

      await usersCrud.create(userData);
      
      setFormData({ name: '', email: '', age: '', phone: '', address: '' });
      setError('');
      await loadUsers();
    } catch (err) {
      setError('Failed to create user: ' + err.message);
    }
  };

  // Update existing user using CRUD engine (append-only)
  const updateUser = async () => {
    if (!usersCrud || !editingId) return;

    try {
      const userData = {
        name: formData.name,
        data: {
          email: formData.email || null,
          age: formData.age ? parseInt(formData.age) : null,
          phone: formData.phone || null,
          address: formData.address || null
        }
      };

      await usersCrud.update(editingId, userData);
      
      setFormData({ name: '', email: '', age: '', phone: '', address: '' });
      setEditingId(null);
      setError('');
      await loadUsers();
    } catch (err) {
      setError('Failed to update user: ' + err.message);
    }
  };

  // Delete user using CRUD engine (soft delete)
  const deleteUser = async (id) => {
    if (!usersCrud) return;
    
    try {
      await usersCrud.delete(id);
      await loadUsers();
    } catch (err) {
      setError('Failed to delete user: ' + err.message);
    }
  };

  // Start editing a user
  const startEdit = (user) => {
    setFormData({
      name: user.name,
      email: user.data?.email || '',
      age: user.data?.age?.toString() || '',
      phone: user.data?.phone || '',
      address: user.data?.address || ''
    });
    setEditingId(user.id);
  };

  // Cancel editing
  const cancelEdit = () => {
    setFormData({ name: '', email: '', age: '', phone: '', address: '' });
    setEditingId(null);
  };

  // Handle form submission
  const handleSubmit = () => {
    if (editingId) {
      updateUser();
    } else {
      createUser();
    }
  };

  // Handle pagination
  const handlePageChange = (newPage) => {
    setQueryParams(prev => ({ ...prev, page: newPage }));
  };

  // Handle search
  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
    setQueryParams(prev => ({ ...prev, page: 1 })); // Reset to first page
  };

  // Handle sort change
  const handleSortChange = (e) => {
    setQueryParams(prev => ({ ...prev, sort: e.target.value, page: 1 }));
  };

  // Handle limit change
  const handleLimitChange = (e) => {
    setQueryParams(prev => ({ ...prev, limit: parseInt(e.target.value), page: 1 }));
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-xl">Initializing database...</div>
      </div>
    );
  }

  const totalPages = Math.ceil(totalCount / queryParams.limit);

  return (
    <div className="max-w-6xl mx-auto p-6 bg-gray-50 min-h-screen">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">User Management with CRUD Engine</h1>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {/* Search and Controls */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <input
              type="text"
              value={searchTerm}
              onChange={handleSearch}
              placeholder="Search by name..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sort</label>
            <select
              value={queryParams.sort}
              onChange={handleSortChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="desc_created_at">Newest First</option>
              <option value="created_at">Oldest First</option>
              <option value="name">Name A-Z</option>
              <option value="desc_name">Name Z-A</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Per Page</label>
            <select
              value={queryParams.limit}
              onChange={handleLimitChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="5">5</option>
              <option value="10">10</option>
              <option value="20">20</option>
              <option value="50">50</option>
            </select>
          </div>
          
          <div className="flex items-end">
            <div className="text-sm text-gray-600">
              Total: {totalCount} users
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="bg-gray-50 p-4 rounded-lg mb-6">
          <h2 className="text-xl font-semibold mb-4">
            {editingId ? 'Edit User' : 'Add New User'}
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Age</label>
              <input
                type="number"
                name="age"
                value={formData.age}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          
          <div className="mt-4 flex gap-2">
            <button
              onClick={handleSubmit}
              className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {editingId ? 'Update User' : 'Add User'}
            </button>
            
            {editingId && (
              <button
                onClick={cancelEdit}
                className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                Cancel
              </button>
            )}
          </div>
        </div>

        {/* Users List */}
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-200 rounded-lg">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Name</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Email</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Age</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Phone</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Created</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {userList.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-900">{user.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{user.data?.email || '-'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{user.data?.age || '-'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{user.data?.phone || '-'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {new Date(user.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-sm space-x-2">
                    <button
                      onClick={() => startEdit(user)}
                      className="text-blue-600 hover:text-blue-800 font-medium"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deleteUser(user.id)}
                      className="text-red-600 hover:text-red-800 font-medium"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {userList.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No users found
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-6 flex justify-between items-center">
            <div className="text-sm text-gray-600">
              Page {queryParams.page} of {totalPages} 
              ({((queryParams.page - 1) * queryParams.limit) + 1}-{Math.min(queryParams.page * queryParams.limit, totalCount)} of {totalCount})
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={() => handlePageChange(queryParams.page - 1)}
                disabled={queryParams.page === 1}
                className="px-3 py-1 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Previous
              </button>
              
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const page = i + Math.max(1, queryParams.page - 2);
                if (page > totalPages) return null;
                
                return (
                  <button
                    key={page}
                    onClick={() => handlePageChange(page)}
                    className={`px-3 py-1 border rounded-md ${
                      page === queryParams.page
                        ? 'bg-blue-500 text-white border-blue-500'
                        : 'border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {page}
                  </button>
                );
              })}
              
              <button
                onClick={() => handlePageChange(queryParams.page + 1)}
                disabled={queryParams.page === totalPages}
                className="px-3 py-1 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserCRUD;
// import React, { useState, useEffect } from 'react';
// import { PGlite } from '@electric-sql/pglite';
// import { drizzle } from 'drizzle-orm/pglite';
// import { pgTable, serial, text, integer } from 'drizzle-orm/pg-core';
// import { eq } from 'drizzle-orm';

// // Define the schema
// const users = pgTable('users', {
//   id: serial('id').primaryKey(),
//   name: text('name').notNull(),
//   email: text('email').notNull(),
//   age: integer('age')
// });

// const UserCRUD = () => {
// const [db, setDb] = useState<ReturnType<typeof drizzle> | null>(null);


//   const [userList, setUserList] = useState([]);
//   const [formData, setFormData] = useState({ name: '', email: '', age: '' });
//   const [editingId, setEditingId] = useState(null);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState('');

//   // Initialize database
//   useEffect(() => {
//     const initDB = async () => {
//     try {
//    const client = new PGlite({
//           dataDir: 'idb://user-database'
//         });
//          await client.waitReady; 
//         // Wait for initialization with timeout
//         const timeoutPromise = new Promise((_, reject) => 
//           setTimeout(() => reject(new Error('Database initialization timeout')), 10000)
//         );
        
//         await Promise.race([client.waitReady, timeoutPromise]);
        
//         const database = drizzle(client);
        
//         // Create table if it doesn't exist
//         await client.exec(`
//           CREATE TABLE IF NOT EXISTS users (
//             id SERIAL PRIMARY KEY,
//             name TEXT NOT NULL,
//             email TEXT NOT NULL,
//             age INTEGER
//           );
//         `);
        
//         setDb(database);
//         setLoading(false);
//         console.log('Database initialized with IndexedDB persistence');
        
//       } catch (err) {
//         console.log(err)
//         setError('Failed to initialize database: ' + err.message);
//         setLoading(false);
//       }
//     };
    
//     initDB();
//   }, []);

//   // Load users from database
//   const loadUsers = async () => {
//     if (!db) return;
    
//     try {
//       const result = await db.select().from(users);
//       setUserList(result);
//     } catch (err) {
//       setError('Failed to load users: ' + err.message);
//     }
//   };

//   // Load users when db is ready
//   useEffect(() => {
//     if (db) {
//       loadUsers();
//     }
//   }, [db]);

//   // Handle form input changes
//   const handleInputChange = (e) => {
//     const { name, value } = e.target;
//     setFormData(prev => ({
//       ...prev,
//       [name]: value
//     }));
//   };

//   // Create new user
//   const createUser = async () => {
//     console.log(db , formData.name , formData.email)

//     if (!db || !formData.name || !formData.email) {
//       setError('Name and email are required');
//       return;
//     }
//     try {
//       await db.insert(users).values({
//         name: formData.name,
//         email: formData.email,
//         age: formData.age ? parseInt(formData.age) : null
//       });
      
//       setFormData({ name: '', email: '', age: '' });
//       setError('');
//       await loadUsers();
//     } catch (err) {
//       setError('Failed to create user: ' + err.message);
//     }
//   };

//   // Update existing user
//   const updateUser = async () => {
//     if (!db || !editingId) return;

//     try {
//       await db.update(users)
//         .set({
//           name: formData.name,
//           email: formData.email,
//           age: formData.age ? parseInt(formData.age) : null
//         })
//         .where(eq(users.id, editingId));
      
//       setFormData({ name: '', email: '', age: '' });
//       setEditingId(null);
//       setError('');
//       await loadUsers();
//     } catch (err) {
//       setError('Failed to update user: ' + err.message);
//     }
//   };

//   // Delete user
//   const deleteUser = async (id) => {
//     if (!db) return;
    
//     try {
//       await db.delete(users).where(eq(users.id, id));
//       await loadUsers();
//     } catch (err) {
//       setError('Failed to delete user: ' + err.message);
//     }
//   };

//   // Start editing a user
//   const startEdit = (user) => {
//     setFormData({
//       name: user.name,
//       email: user.email,
//       age: user.age?.toString() || ''
//     });
//     setEditingId(user.id);
//   };

//   // Cancel editing
//   const cancelEdit = () => {
//     setFormData({ name: '', email: '', age: '' });
//     setEditingId(null);
//   };

//   // Handle form submission
//   const handleSubmit = () => {
//     if (editingId) {
//       updateUser();
//     } else {
//       createUser();
//     }
//   };

//   if (loading) {
//     return (
//       <div className="flex justify-center items-center h-64">
//         <div className="text-lg">Initializing database...</div>
//       </div>
//     );
//   }

//   return (
//     <div className="max-w-4xl mx-auto p-6 bg-white">
//       <h1 className="text-3xl font-bold mb-6 text-center text-gray-800">
//         User Management with Drizzle + PGlite
//       </h1>
      
//       {error && (
//         <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
//           {error}
//         </div>
//       )}

//       {/* Form */}
//       <div className="bg-gray-50 p-6 rounded-lg mb-6">
//         <h2 className="text-xl font-semibold mb-4">
//           {editingId ? 'Edit User' : 'Add New User'}
//         </h2>
        
//         <div className="space-y-4">
//           <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
//             <div>
//               <label className="block text-sm font-medium text-gray-700 mb-1">
//                 Name *
//               </label>
//               <input
//                 type="text"
//                 name="name"
//                 value={formData.name}
//                 onChange={handleInputChange}
//                 className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
//                 required
//               />
//             </div>
            
//             <div>
//               <label className="block text-sm font-medium text-gray-700 mb-1">
//                 Email *
//               </label>
//               <input
//                 type="email"
//                 name="email"
//                 value={formData.email}
//                 onChange={handleInputChange}
//                 className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
//                 required
//               />
//             </div>
            
//             <div>
//               <label className="block text-sm font-medium text-gray-700 mb-1">
//                 Age
//               </label>
//               <input
//                 type="number"
//                 name="age"
//                 value={formData.age}
//                 onChange={handleInputChange}
//                 className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
//               />
//             </div>
//           </div>
          
//           <div className="flex gap-2">
//             <button
//               onClick={handleSubmit}
//               className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md transition-colors"
//             >
//               {editingId ? 'Update User' : 'Add User'}
//             </button>
            
//             {editingId && (
//               <button
//                 onClick={cancelEdit}
//                 className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-md transition-colors"
//               >
//                 Cancel
//               </button>
//             )}
//           </div>
//         </div>
//       </div>

//       {/* Users List */}
//       <div className="bg-white rounded-lg shadow">
//         <h2 className="text-xl font-semibold p-4 border-b">Users List</h2>
        
//         {userList.length === 0 ? (
//           <div className="p-8 text-center text-gray-500">
//             No users found. Add your first user above!
//           </div>
//         ) : (
//           <div className="overflow-x-auto">
//             <table className="w-full">
//               <thead className="bg-gray-50">
//                 <tr>
//                   <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">ID</th>
//                   <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Name</th>
//                   <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Email</th>
//                   <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Age</th>
//                   <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Actions</th>
//                 </tr>
//               </thead>
//               <tbody className="divide-y divide-gray-200">
//                 {userList.map((user) => (
//                   <tr key={user.id} className="hover:bg-gray-50">
//                     <td className="px-4 py-3 text-sm text-gray-900">{user.id}</td>
//                     <td className="px-4 py-3 text-sm text-gray-900">{user.name}</td>
//                     <td className="px-4 py-3 text-sm text-gray-900">{user.email}</td>
//                     <td className="px-4 py-3 text-sm text-gray-900">{user.age || 'N/A'}</td>
//                     <td className="px-4 py-3 text-sm">
//                       <div className="flex gap-2">
//                         <button
//                           onClick={() => startEdit(user)}
//                           className="text-blue-600 hover:text-blue-800 font-medium"
//                         >
//                           Edit
//                         </button>
//                         <button
//                           onClick={() => deleteUser(user.id)}
//                           className="text-red-600 hover:text-red-800 font-medium"
//                         >
//                           Delete
//                         </button>
//                       </div>
//                     </td>
//                   </tr>
//                 ))}
//               </tbody>
//             </table>
//           </div>
//         )}
//       </div>

//       {/* Info */}
//       <div className="mt-6 p-4 bg-blue-50 rounded-lg">
//         <h3 className="font-semibold text-blue-800 mb-2">Database Info</h3>
//         <p className="text-sm text-blue-700">
//           This component uses PGlite with IndexedDB persistence. Your data is stored locally in the browser 
//           and will persist between sessions. The database is initialized with a "users" table automatically.
//         </p>
//       </div>
//     </div>
//   );
// };

// export default UserCRUD;