import { useState, useEffect } from "react"
import { useToast } from "../../contexts/ToastContext"
import DashboardHeader from "../../components/DashboardHeader"
import { Card, CardHeader, CardTitle, CardContent } from "../../components/ui/Card"
import Button from "../../components/ui/Button"
import Input from "../../components/ui/Input"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "../../components/ui/Table"
import Textarea from "../../components/ui/Textarea"
import { capitalizeFirstLetter, Server } from "../../Constants"
import axios from "axios"

function AdminDepartmentsPage() {
  const [departments, setDepartments] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [editingDepartment, setEditingDepartment] = useState(null)
  const [newDepartment, setNewDepartment] = useState({
    name: "",
    description: "",
  })
  const { toast } = useToast()

  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const response = await axios.get(`${Server}/departments`, { withCredentials: true });
        setDepartments(response.data);

      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to load departments",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchDepartments()
  }, [])

  const handleInputChange = (e) => {
    const { name, value } = e.target
    if (editingDepartment) {
      setEditingDepartment({
        ...editingDepartment,
        [name]: value,
      })
    } else {
      setNewDepartment({
        ...newDepartment,
        [name]: value,
      })
    }
  }

  const handleAddDepartment = async (e) => {
    e.preventDefault()
    if (!newDepartment.name) {
      toast({
        title: "Error",
        description: "Department name is required",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    try {
      const response = await axios.post(`${Server}/departments`, newDepartment, { withCredentials: true });
      const addedDepartment = response.data;

      setDepartments([...departments, addedDepartment])
      setNewDepartment({ name: "", description: "" })

      toast({
        title: "Success",
        description: "Department added successfully",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add department",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEditDepartment = (department) => {
    setEditingDepartment({ ...department })
  }

  const handleUpdateDepartment = async () => {
    if (!editingDepartment.name) {
      toast({
        title: "Error",
        description: "Department name is required",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    try {
      await axios.put(`${Server}/departments/${editingDepartment._id}`, editingDepartment, { withCredentials: true });

      // Update department in state
      setDepartments(departments.map((dept) => (dept._id === editingDepartment._id ? { ...editingDepartment } : dept)))

      toast({
        title: "Success",
        description: "Department updated successfully",
      })

      setEditingDepartment(null)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update department",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteDepartment = async (id) => {
    if (!window.confirm("Are you sure you want to delete this department ? This action is IRREVERSIBLE !!")) {
      return
    }

    try {
      await axios.delete(`${Server}/departments/${id}`, { withCredentials: true });

      // Remove department from state
      setDepartments(departments.filter((dept) => dept._id !== id))

      toast({
        title: "Success",
        description: "Department deleted successfully",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete department",
        variant: "destructive",
      })
    }
  }

  const handleCancelEdit = () => {
    setEditingDepartment(null)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen ">
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
          <h1 className="text-2xl font-bold text-[goldenrod]">Manage Departments</h1>
          <p className="text-gray-200">Add, edit, or remove departments in the system</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Departments</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="w-[120px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {departments.map((department) => (
                      <TableRow key={department._id}>
                        <TableCell className="font-medium">{department.name.toUpperCase()}</TableCell>
                        <TableCell>{department.description}</TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button variant="outline" size="sm" onClick={() => handleEditDepartment(department)}>
                              Edit
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDeleteDepartment(department._id)}
                            >
                              Delete
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {departments.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center py-4">
                          No departments found
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
                <CardTitle>{editingDepartment ? "Edit Department" : "Add Department"}</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={editingDepartment ? undefined : handleAddDepartment}>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-200 mb-1">Name</label>
                      <Input
                        name="name"
                        value={editingDepartment ? editingDepartment.name : newDepartment.name}
                        onChange={handleInputChange}
                        placeholder="Department name"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-200 mb-1">Description</label>
                      <Textarea
                        name="description"
                        value={editingDepartment ? editingDepartment.description : newDepartment.description}
                        onChange={handleInputChange}
                        placeholder="Department description"
                        rows={3}
                      />
                    </div>

                    {editingDepartment ? (
                      <div className="flex space-x-2">
                        <Button
                          type="button"
                          onClick={handleUpdateDepartment}
                          disabled={isSubmitting}
                          className="flex-1"
                        >
                          {isSubmitting ? "Updating..." : "Update Department"}
                        </Button>
                        <Button type="button" variant="outline" onClick={handleCancelEdit} disabled={isSubmitting}>
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <Button type="submit" disabled={isSubmitting} className="w-full">
                        {isSubmitting ? "Adding..." : "Add Department"}
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

export default AdminDepartmentsPage
