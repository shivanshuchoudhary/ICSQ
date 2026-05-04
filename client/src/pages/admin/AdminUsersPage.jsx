import { useState, useEffect } from "react"
import { useToast } from "../../contexts/ToastContext"
import DashboardHeader from "../../components/DashboardHeader"
import { Card, CardHeader, CardTitle, CardContent } from "../../components/ui/Card"
import Button from "../../components/ui/Button"
import Input from "../../components/ui/Input"
import Select from "../../components/ui/Select"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "../../components/ui/Table"
import Badge from "../../components/ui/Badge"
import axios from "axios"
import { capitalizeFirstLetter, getDepartmentName, Server } from "../../Constants"
import { useMemo } from "react"

function AdminUsersPage() {
  const [users, setUsers] = useState([])
  const [departments, setDepartments] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    department: "",
    role: "user",
    password: "",
    headedDepartments: [],
  })
  const { toast } = useToast()

  useEffect(() => {
    const fetchData = async () => {
      try {
        const usersResponse = await axios.get(`${Server}/users`, { withCredentials: true });
        const departmentsResponse = await axios.get(`${Server}/departments`, { withCredentials: true });
        
        setUsers(usersResponse.data);
        setDepartments(departmentsResponse.data);
      } catch (error) {
        console.log(error);
        
        toast({
          title: "Error",
          description: "Failed to load data",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [])

  const handleInputChange = (e) => {
    const { name, value } = e.target
    if (editingUser) {
      setEditingUser({
        ...editingUser,
        [name]: value,
      })
    } else {
      setNewUser({
        ...newUser,
        [name]: value,
      })
    }
  }

  const handleSelectChange = (name, value) => {
    if (editingUser) {
      setEditingUser({
        ...editingUser,
        [name]: value,
      })
    } else {
      setNewUser({
        ...newUser,
        [name]: value,
      })
    }
  }

  const handleHeadedDepartmentsChange = (selected) => {
    if (editingUser) {
      setEditingUser({
        ...editingUser,
        headedDepartments: selected,
      })
    } else {
      setNewUser({
        ...newUser,
        headedDepartments: selected,
      })
    }
  }

  const handleAddUser = async (e) => {
    e.preventDefault()
    if (!newUser.name || !newUser.email || !newUser.department || !newUser.password) {
      toast({
        title: "Error",
        description: "All fields are required",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    try {
      const payload = { ...newUser };
      if (newUser.role !== "hod") delete payload.headedDepartments;
      const response = await axios.post(`${Server}/users`, payload, { withCredentials: true });
      const addedUser = response.data.user;
      
      setUsers([...users, addedUser])
      setNewUser({
        name: "",
        email: "",
        department: "",
        role: "user",
        password: "",
        headedDepartments: [],
      })

      toast({
        title: "Success",
        description: "User added successfully",
      })
    } catch (error) {
      console.log(error);
      
      toast({
        title: "Error",
        description: "Failed to add user",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEditUser = (user) => {
    setEditingUser({ ...user,  password: "" }) 
  }

  const handleUpdateUser = async () => {
    if (!editingUser.name || !editingUser.email || !editingUser.department) {
      toast({
        title: "Error",
        description: "Name, email, and department are required",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    try {
      const payload = { ...editingUser };
      if (!editingUser.password) delete payload.password;
      if (editingUser.role !== "hod") delete payload.headedDepartments;
      await axios.put(`${Server}/users/${editingUser._id}`, payload, { withCredentials: true });

      setUsers(
        users.map((user) => {
          if (user._id === editingUser._id) {
            const updatedUser = { ...editingUser }
            delete updatedUser.password 
            return updatedUser
          }
          return user
        }),
      )

      toast({
        title: "Success",
        description: "User updated successfully",
      })

      setEditingUser(null)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update user",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteUser = async (id) => {
    if (!window.confirm("Are you sure you want to delete this user? This action is IRREVERSIBLE!")) {
      return
    }

    try {
      await axios.delete(`${Server}/users/${id}`, { withCredentials: true });

      // Remove user from state
      setUsers(users.filter((user) => user._id !== id))

      toast({
        title: "Success",
        description: "User deleted successfully",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete user",
        variant: "destructive",
      })
    }
  }

  const handleCancelEdit = () => {
    setEditingUser(null)
  }


  if (isLoading) {
    return (
      <div className="min-h-screen">
        <DashboardHeader />
        <div className="container mx-auto py-8 px-4">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <DashboardHeader />

      <main className="container mx-auto py-8 px-4">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-[goldenrod]">Manage Users</h1>
          <p className="text-gray-200">Add, edit, or remove users in the system</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Users</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow >
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead className="w-[120px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user._id}>
                        <TableCell className="font-medium">{user.name}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>{getDepartmentName(user.department, departments)}</TableCell>
                        <TableCell>
                          <Badge variant={user.role === "admin" ? "success" : user.role === "hod" ? "primary" : "default"}>
                            {capitalizeFirstLetter(user.role)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button variant="outline" size="sm" onClick={() => handleEditUser(user)}>
                              Edit
                            </Button>
                            <Button variant="destructive" size="sm" onClick={() => handleDeleteUser(user._id)}>
                              Delete
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {users.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-4">
                          No users found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          <div>
            <Card>
              <CardHeader>
                <CardTitle>{editingUser ? "Edit User" : "Add User"}</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={editingUser ? undefined : handleAddUser}>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-200 mb-1">Name</label>
                      <Input
                        name="name"
                        value={editingUser ? editingUser.name : newUser.name}
                        onChange={handleInputChange}
                        placeholder="Full name"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-200 mb-1">Email</label>
                      <Input
                        name="email"
                        type="email"
                        value={editingUser ? editingUser.email : newUser.email}
                        onChange={handleInputChange}
                        placeholder="Email address"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-200 mb-1">Department</label>
                      <Select
                        value={editingUser ? editingUser.department : newUser.department}
                        onValueChange={(value) => handleSelectChange("department", value)}
                        options={departments.map((dept, index) => ({ value: dept._id, label:getDepartmentName(dept._id, departments) , key :index}))}
                        placeholder="Select department"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-200 mb-1">Role</label>
                      <Select
                        value={editingUser ? editingUser.role : newUser.role}
                        onValueChange={(value) => handleSelectChange("role", value)}
                        options={[
                          { value: "user", label: "User" },
                          { value: "hod", label: "HOD" },
                          { value: "admin", label: "Admin" },
                        ]}
                      />
                    </div>
                    {(editingUser ? editingUser.role : newUser.role) === "hod" && (
                      <div>
                        <label className="block text-sm font-medium text-gray-200 mb-1">Departments this HOD will head (other than their own)</label>
                        <select
                          multiple
                          className="w-full p-2 rounded-md bg-white/10 text-gray-200 border border-gray-600 focus:outline-none focus:border-[goldenrod]"
                          value={editingUser ? (editingUser.headedDepartments || []) : (newUser.headedDepartments || [])}
                          onChange={e => {
                            const selected = Array.from(e.target.selectedOptions).map(opt => opt.value);
                            handleHeadedDepartmentsChange(selected);
                          }}
                        >
                          {departments
                            .filter(dept => dept._id !== (editingUser ? editingUser.department : newUser.department))
                            .map(dept => (
                              <option key={dept._id} value={dept._id}>
                                {getDepartmentName(dept._id, departments)}
                              </option>
                            ))}
                        </select>
                        <p className="text-xs text-gray-400 mt-1">Hold Ctrl (Windows) or Cmd (Mac) to select multiple.</p>
                      </div>
                    )}
                    <div>
                      <label className="block text-sm font-medium text-gray-200 mb-1">
                        {editingUser ? "Password (leave blank to keep current)" : "Password"}
                      </label>
                      <Input
                        name="password"
                        type="password"
                        value={editingUser ? editingUser.password : newUser.password}
                        onChange={handleInputChange}
                        placeholder="Password"
                        required={!editingUser}
                      />
                    </div>

                    {editingUser ? (
                      <div className="flex space-x-2">
                        <Button type="button" onClick={handleUpdateUser} disabled={isSubmitting} className="flex-1">
                          {isSubmitting ? "Updating..." : "Update User"}
                        </Button>
                        <Button type="button" variant="outline" onClick={handleCancelEdit} disabled={isSubmitting}>
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <Button type="submit" disabled={isSubmitting} className="w-full">
                        {isSubmitting ? "Adding..." : "Add User"}
                      </Button>
                    )}
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}

export default AdminUsersPage
