import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Tab,
  Tabs,
  Paper,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Autocomplete
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Save as SaveIcon,
  Preview as PreviewIcon,
  Code as CodeIcon,
  Description as DescriptionIcon,
  Visibility as VisibilityIcon,
  Add as AddIcon,
  Settings as SettingsIcon,
  Edit as EditIcon
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { apiService } from '../services/api';
import toast from 'react-hot-toast';
import SwaggerUI from 'swagger-ui-react';
import 'swagger-ui-react/swagger-ui.css';

const APIEditor = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [tabValue, setTabValue] = useState(0);
  const [unsavedChanges, setUnsavedChanges] = useState(false);
  const [newTag, setNewTag] = useState('');
  const [addTagOpen, setAddTagOpen] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    status: 'draft',
    visibility: 'private',
    category: 'other',
    tags: []
  });

  // OpenAPI spec state
  const [specData, setSpecData] = useState('');
  const [specError, setSpecError] = useState('');

  // Schema management state
  const [schemas, setSchemas] = useState({});
  const [selectedSchema, setSelectedSchema] = useState(null);
  const [schemaDialogOpen, setSchemaDialogOpen] = useState(false);
  const [newSchemaName, setNewSchemaName] = useState('');
  const [editingSchema, setEditingSchema] = useState(null);

  // Name editing state
  const [isEditingName, setIsEditingName] = useState(false);

  // Schema integration state
  const [integrationDialogOpen, setIntegrationDialogOpen] = useState(false);
  const [selectedSchemaForIntegration, setSelectedSchemaForIntegration] = useState(null);
  const [availablePaths, setAvailablePaths] = useState([]);
  const [integrationSettings, setIntegrationSettings] = useState({
    path: '',
    method: '',
    usage: 'response', // 'request' or 'response'
    statusCode: '200'
  });

  // Get API details
  const { data: apiData, isLoading, error } = useQuery({
    queryKey: ['api-detail', id],
    queryFn: () => apiService.getAPI(id),
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    onSuccess: (data) => {
      const api = data.data.api;
      
      console.log('🔧 [API EDITOR] Full API response received:', data);
      console.log('🔧 [API EDITOR] API object structure:', {
        apiId: id,
        apiName: api.name,
        apiDescription: api.description,
        apiStatus: api.status,
        apiVisibility: api.visibility,
        apiCategory: api.category,
        apiTags: api.tags,
        currentVersion: api.currentVersion,
        versionsLength: api.versions?.length,
        currentVersionSpec: api.currentVersionSpec,
        currentVersionSpecType: typeof api.currentVersionSpec,
        currentVersionSpecKeys: api.currentVersionSpec ? Object.keys(api.currentVersionSpec) : null,
        firstVersionOpenApiSpec: api.versions?.[0]?.openApiSpec,
        allKeys: Object.keys(api)
      });
      
      setFormData({
        name: api.name || '',
        description: api.description || '',
        status: api.status || 'draft',
        visibility: api.visibility || 'private',
        category: api.category || 'other',
        tags: api.tags || []
      });
      
      // Set OpenAPI spec - try multiple sources
      let specToSet = '';
      
      if (api.currentVersionSpec) {
        specToSet = JSON.stringify(api.currentVersionSpec, null, 2);
        console.log('🔧 [API EDITOR] Using currentVersionSpec, length:', specToSet.length);
      } else if (api.versions && api.versions.length > 0 && api.versions[0].openApiSpec) {
        specToSet = JSON.stringify(api.versions[0].openApiSpec, null, 2);
        console.log('🔧 [API EDITOR] Using first version openApiSpec, length:', specToSet.length);
      } else {
        console.log('❌ [API EDITOR] No OpenAPI spec found for this API');
        specToSet = '';
      }
      
      setSpecData(specToSet);
    }
  });

  const api = apiData?.data?.api;

  // Additional effect to handle spec loading after API data changes
  useEffect(() => {
    if (api) {
      console.log('🔧 [API EDITOR] useEffect - API data changed, re-checking spec:', {
        hasCurrentVersionSpec: !!api.currentVersionSpec,
        hasVersions: !!api.versions,
        versionsLength: api.versions?.length,
        currentSpecData: specData.length
      });
      
      // Only update if we don't have spec data yet
      if (!specData || specData.trim() === '') {
        let specToSet = '';
        
        if (api.currentVersionSpec) {
          specToSet = JSON.stringify(api.currentVersionSpec, null, 2);
          console.log('🔧 [API EDITOR] useEffect - Setting currentVersionSpec, length:', specToSet.length);
        } else if (api.versions && api.versions.length > 0 && api.versions[0].openApiSpec) {
          specToSet = JSON.stringify(api.versions[0].openApiSpec, null, 2);
          console.log('🔧 [API EDITOR] useEffect - Setting first version openApiSpec, length:', specToSet.length);
        }
        
        if (specToSet) {
          setSpecData(specToSet);
        }
      }
    }
  }, [api, specData]);

  // Extract schemas from OpenAPI spec
  useEffect(() => {
    if (specData) {
      try {
        const spec = JSON.parse(specData);
        if (spec.components && spec.components.schemas) {
          setSchemas(spec.components.schemas);
          console.log('🔧 [API EDITOR] Schemas extracted:', Object.keys(spec.components.schemas));
        }
        
        // Extract available paths for schema integration
        if (spec.paths) {
          const paths = [];
          Object.keys(spec.paths).forEach(path => {
            Object.keys(spec.paths[path]).forEach(method => {
              if (['get', 'post', 'put', 'patch', 'delete'].includes(method.toLowerCase())) {
                paths.push({
                  path,
                  method: method.toUpperCase(),
                  summary: spec.paths[path][method].summary || `${method.toUpperCase()} ${path}`
                });
              }
            });
          });
          setAvailablePaths(paths);
          console.log('🔧 [API EDITOR] Available paths extracted:', paths.length);
        }
      } catch (error) {
        console.error('Error parsing spec for schemas:', error);
      }
    }
  }, [specData]);

  // Schema management functions
  const handleSchemaEdit = (schemaName) => {
    setSelectedSchema(schemaName);
    setEditingSchema(JSON.stringify(schemas[schemaName], null, 2));
    setSchemaDialogOpen(true);
  };

  const handleSchemaCreate = () => {
    if (newSchemaName.trim()) {
      console.log('🔧 [API EDITOR] Creating new schema:', newSchemaName);
      
      const newSchema = {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            description: 'Unique identifier'
          }
        },
        required: ['id']
      };
      
      const updatedSchemas = {
        ...schemas,
        [newSchemaName]: newSchema
      };
      
      console.log('🔧 [API EDITOR] Updated schemas:', Object.keys(updatedSchemas));
      
      setSchemas(updatedSchemas);
      updateSpecWithSchemas(updatedSchemas);
      setNewSchemaName('');
      toast.success(`Schema "${newSchemaName}" creado y guardado`);
    }
  };

  const handleSchemaSave = () => {
    console.log('🔧 [API EDITOR] Saving schema:', selectedSchema);
    console.log('🔧 [API EDITOR] Schema content length:', editingSchema?.length || 0);
    
    try {
      const updatedSchema = JSON.parse(editingSchema);
      console.log('🔧 [API EDITOR] Parsed schema keys:', Object.keys(updatedSchema));
      
      const updatedSchemas = {
        ...schemas,
        [selectedSchema]: updatedSchema
      };
      
      console.log('🔧 [API EDITOR] All schemas after update:', Object.keys(updatedSchemas));
      
      setSchemas(updatedSchemas);
      updateSpecWithSchemas(updatedSchemas);
      setSchemaDialogOpen(false);
      toast.success('Schema guardado automáticamente');
    } catch (error) {
      console.error('❌ [API EDITOR] Schema JSON parse error:', error);
      toast.error('JSON inválido en el schema');
    }
  };

  const handleSchemaDelete = (schemaName) => {
    console.log('🔧 [API EDITOR] Deleting schema:', schemaName);
    
    try {
      // Parse current spec to clean up references
      const spec = JSON.parse(specData);
      const schemaRef = `#/components/schemas/${schemaName}`;
      
      console.log('🔧 [API EDITOR] Looking for references to:', schemaRef);
      console.log('🔧 [API EDITOR] Current schemas:', Object.keys(spec.components?.schemas || {}));
      
      // Track found references for debugging
      const foundReferences = [];
      
      // Function to recursively remove schema references from an object
      const removeSchemaReference = (obj, path = '') => {
        if (!obj || typeof obj !== 'object') return obj;
        
        if (Array.isArray(obj)) {
          const filteredArray = obj.map((item, index) => removeSchemaReference(item, `${path}[${index}]`))
            .filter(item => {
              // Remove items that are just the deleted schema reference
              if (item && item.$ref === schemaRef) {
                foundReferences.push(`${path}[array item]`);
                return false;
              }
              return true;
            });
          return filteredArray;
        }
        
        const newObj = {};
        for (const [key, value] of Object.entries(obj)) {
          const currentPath = path ? `${path}.${key}` : key;
          
          if (key === '$ref' && value === schemaRef) {
            // Skip this reference entirely
            foundReferences.push(currentPath);
            console.log(`🔧 [API EDITOR] Removing reference at: ${currentPath}`);
            continue;
          } else if (key === 'allOf' && Array.isArray(value)) {
            // Handle allOf arrays - remove the deleted schema reference
            const filteredAllOf = value.filter((item, index) => {
              if (item && item.$ref === schemaRef) {
                foundReferences.push(`${currentPath}[${index}]`);
                console.log(`🔧 [API EDITOR] Removing from allOf at: ${currentPath}[${index}]`);
                return false;
              }
              return true;
            }).map(item => removeSchemaReference(item, `${currentPath}[item]`));
            
            if (filteredAllOf.length > 0) {
              newObj[key] = filteredAllOf;
            }
            // If allOf becomes empty, don't include it
          } else if (key === 'oneOf' && Array.isArray(value)) {
            // Handle oneOf arrays
            const filteredOneOf = value.filter((item, index) => {
              if (item && item.$ref === schemaRef) {
                foundReferences.push(`${currentPath}[${index}]`);
                console.log(`🔧 [API EDITOR] Removing from oneOf at: ${currentPath}[${index}]`);
                return false;
              }
              return true;
            }).map(item => removeSchemaReference(item, `${currentPath}[item]`));
            
            if (filteredOneOf.length > 0) {
              newObj[key] = filteredOneOf;
            }
          } else if (key === 'anyOf' && Array.isArray(value)) {
            // Handle anyOf arrays
            const filteredAnyOf = value.filter((item, index) => {
              if (item && item.$ref === schemaRef) {
                foundReferences.push(`${currentPath}[${index}]`);
                console.log(`🔧 [API EDITOR] Removing from anyOf at: ${currentPath}[${index}]`);
                return false;
              }
              return true;
            }).map(item => removeSchemaReference(item, `${currentPath}[item]`));
            
            if (filteredAnyOf.length > 0) {
              newObj[key] = filteredAnyOf;
            }
          } else if (value && typeof value === 'object') {
            const cleanedValue = removeSchemaReference(value, currentPath);
            // Only include non-empty objects (but preserve objects with meaningful content)
            if (cleanedValue && (Object.keys(cleanedValue).length > 0 || Array.isArray(cleanedValue))) {
              newObj[key] = cleanedValue;
            } else if (cleanedValue === null || cleanedValue === undefined) {
              // Don't include null/undefined values
            } else {
              // Include primitive values and empty arrays
              newObj[key] = cleanedValue;
            }
          } else {
            newObj[key] = value;
          }
        }
        return newObj;
      };
      
      // Clean up references in all paths
      if (spec.paths) {
        console.log('🔧 [API EDITOR] Cleaning references in paths...');
        Object.keys(spec.paths).forEach(path => {
          Object.keys(spec.paths[path]).forEach(method => {
            const endpoint = spec.paths[path][method];
            if (endpoint && typeof endpoint === 'object') {
              console.log(`🔧 [API EDITOR] Checking endpoint: ${method.toUpperCase()} ${path}`);
              
              // Clean request body references
              if (endpoint.requestBody) {
                const originalRequestBody = JSON.stringify(endpoint.requestBody);
                endpoint.requestBody = removeSchemaReference(endpoint.requestBody, `paths.${path}.${method}.requestBody`);
                const cleanedRequestBody = JSON.stringify(endpoint.requestBody);
                
                if (originalRequestBody !== cleanedRequestBody) {
                  console.log(`🔧 [API EDITOR] Cleaned request body for ${method.toUpperCase()} ${path}`);
                }
                
                // Remove empty requestBody
                if (!endpoint.requestBody || Object.keys(endpoint.requestBody).length === 0) {
                  delete endpoint.requestBody;
                  console.log(`🔧 [API EDITOR] Removed empty request body for ${method.toUpperCase()} ${path}`);
                }
              }
              
              // Clean response references
              if (endpoint.responses) {
                Object.keys(endpoint.responses).forEach(statusCode => {
                  const originalResponse = JSON.stringify(endpoint.responses[statusCode]);
                  endpoint.responses[statusCode] = removeSchemaReference(
                    endpoint.responses[statusCode], 
                    `paths.${path}.${method}.responses.${statusCode}`
                  );
                  const cleanedResponse = JSON.stringify(endpoint.responses[statusCode]);
                  
                  if (originalResponse !== cleanedResponse) {
                    console.log(`🔧 [API EDITOR] Cleaned response ${statusCode} for ${method.toUpperCase()} ${path}`);
                  }
                  
                  // Remove empty responses
                  if (!endpoint.responses[statusCode] || Object.keys(endpoint.responses[statusCode]).length === 0) {
                    delete endpoint.responses[statusCode];
                    console.log(`🔧 [API EDITOR] Removed empty response ${statusCode} for ${method.toUpperCase()} ${path}`);
                  }
                });
              }
              
              // Clean parameters references
              if (endpoint.parameters) {
                endpoint.parameters = removeSchemaReference(endpoint.parameters, `paths.${path}.${method}.parameters`);
              }
            }
          });
        });
      }
      
      // Clean up references in other schemas (important for composite schemas)
      if (spec.components && spec.components.schemas) {
        console.log('🔧 [API EDITOR] Cleaning references in other schemas...');
        Object.keys(spec.components.schemas).forEach(otherSchemaName => {
          if (otherSchemaName !== schemaName) {
            const originalSchema = JSON.stringify(spec.components.schemas[otherSchemaName]);
            spec.components.schemas[otherSchemaName] = removeSchemaReference(
              spec.components.schemas[otherSchemaName], 
              `components.schemas.${otherSchemaName}`
            );
            const cleanedSchema = JSON.stringify(spec.components.schemas[otherSchemaName]);
            
            if (originalSchema !== cleanedSchema) {
              console.log(`🔧 [API EDITOR] Cleaned references in schema: ${otherSchemaName}`);
            }
            
            // Remove empty schemas
            if (!spec.components.schemas[otherSchemaName] || 
                Object.keys(spec.components.schemas[otherSchemaName]).length === 0) {
              delete spec.components.schemas[otherSchemaName];
              console.log(`🔧 [API EDITOR] Removed empty schema: ${otherSchemaName}`);
            }
          }
        });
      }
      
      // Remove the target schema from components.schemas
      const updatedSchemas = { ...spec.components.schemas };
      delete updatedSchemas[schemaName];
      
      // Update spec with cleaned references and removed schema
      if (!spec.components) spec.components = {};
      spec.components.schemas = updatedSchemas;
      
      console.log(`🔧 [API EDITOR] Found and cleaned ${foundReferences.length} references:`, foundReferences);
      console.log('🔧 [API EDITOR] Remaining schemas:', Object.keys(updatedSchemas));
      
      // Update state
      setSchemas(updatedSchemas);
      const updatedSpecData = JSON.stringify(spec, null, 2);
      setSpecData(updatedSpecData);
      setUnsavedChanges(true);
      
      console.log('🔧 [API EDITOR] Schema and references cleaned successfully');
      
      // Auto-save the cleaned spec
      updateSpecMutation.mutate({
        spec,
        changelog: `Schema "${schemaName}" eliminado y ${foundReferences.length} referencias limpiadas`
      });
      
      toast.success(`Schema "${schemaName}" eliminado y ${foundReferences.length} referencias limpiadas`);
      
    } catch (error) {
      console.error('❌ [API EDITOR] Error deleting schema and cleaning references:', error);
      
      // Fallback: just remove from schemas object
      const updatedSchemas = { ...schemas };
      delete updatedSchemas[schemaName];
      
      setSchemas(updatedSchemas);
      updateSpecWithSchemas(updatedSchemas);
      setUnsavedChanges(true);
      toast.success('Schema eliminado (referencias pueden necesitar limpieza manual)');
    }
  };

  const updateSpecWithSchemas = (updatedSchemas) => {
    console.log('🔧 [API EDITOR] Updating spec with schemas:', Object.keys(updatedSchemas));
    console.log('🔧 [API EDITOR] Current spec data length before update:', specData.length);
    
    try {
      const spec = JSON.parse(specData);
      if (!spec.components) spec.components = {};
      spec.components.schemas = updatedSchemas;
      
      const updatedSpecData = JSON.stringify(spec, null, 2);
      console.log('🔧 [API EDITOR] Updated spec data length:', updatedSpecData.length);
      console.log('🔧 [API EDITOR] Schemas in updated spec:', Object.keys(spec.components.schemas));
      
      setSpecData(updatedSpecData);
      
      // Auto-save the spec to backend when schemas are modified
      console.log('🔧 [API EDITOR] Auto-saving spec with schemas to backend');
      updateSpecMutation.mutate({
        spec,
        changelog: 'Schemas actualizados automáticamente'
      });
      
    } catch (error) {
      console.error('❌ [API EDITOR] Error updating spec with schemas:', error);
    }
  };

  // Schema integration functions
  const handleSchemaIntegration = (schemaName) => {
    setSelectedSchemaForIntegration(schemaName);
    setIntegrationSettings({
      path: '',
      method: '',
      usage: 'response',
      statusCode: '200'
    });
    setIntegrationDialogOpen(true);
  };

  // Check if an endpoint already has a schema for the selected usage
  const getEndpointSchemaInfo = () => {
    const { path, method, usage, statusCode } = integrationSettings;
    
    if (!path || !method || !specData) return null;
    
    try {
      const spec = JSON.parse(specData);
      const endpoint = spec.paths?.[path]?.[method.toLowerCase()];
      
      if (!endpoint) return null;
      
      if (usage === 'request') {
        const hasExisting = endpoint.requestBody?.content?.['application/json']?.schema;
        return hasExisting ? 'request' : null;
      } else {
        const hasExisting = endpoint.responses?.[statusCode]?.content?.['application/json']?.schema;
        return hasExisting ? 'response' : null;
      }
    } catch (error) {
      return null;
    }
  };

  const handleIntegrateSchema = () => {
    const { path, method, usage, statusCode } = integrationSettings;
    
    if (!path || !method) {
      toast.error('Por favor selecciona un endpoint');
      return;
    }

    console.log('🔧 [API EDITOR] Integrating schema:', {
      schema: selectedSchemaForIntegration,
      path,
      method,
      usage,
      statusCode
    });

    try {
      const spec = JSON.parse(specData);
      
      if (!spec.paths || !spec.paths[path] || !spec.paths[path][method.toLowerCase()]) {
        toast.error('Endpoint no encontrado en la especificación');
        return;
      }

      const endpoint = spec.paths[path][method.toLowerCase()];
      
      if (usage === 'request') {
        // Handle request body - check if there's already a schema
        if (endpoint.requestBody && 
            endpoint.requestBody.content && 
            endpoint.requestBody.content['application/json'] && 
            endpoint.requestBody.content['application/json'].schema) {
          
          const existingSchema = endpoint.requestBody.content['application/json'].schema;
          
          // If there's already a schema reference, create a composite schema
          if (existingSchema.$ref) {
            // Create a composite schema that includes both
            const compositeSchemaName = `${path.replace(/[^a-zA-Z0-9]/g, '')}_${method}_Request`;
            
            // Add composite schema to components
            if (!spec.components.schemas[compositeSchemaName]) {
              spec.components.schemas[compositeSchemaName] = {
                type: 'object',
                properties: {
                  data: {
                    allOf: [
                      existingSchema,
                      { $ref: `#/components/schemas/${selectedSchemaForIntegration}` }
                    ]
                  }
                }
              };
            } else {
              // Add to existing composite schema
              if (!spec.components.schemas[compositeSchemaName].properties.data.allOf.find(
                schema => schema.$ref === `#/components/schemas/${selectedSchemaForIntegration}`
              )) {
                spec.components.schemas[compositeSchemaName].properties.data.allOf.push({
                  $ref: `#/components/schemas/${selectedSchemaForIntegration}`
                });
              }
            }
            
            // Update the request body to use the composite schema
            endpoint.requestBody.content['application/json'].schema = {
              $ref: `#/components/schemas/${compositeSchemaName}`
            };
          } else {
            // Create a wrapper schema
            endpoint.requestBody.content['application/json'].schema = {
              type: 'object',
              properties: {
                data: {
                  allOf: [
                    existingSchema,
                    { $ref: `#/components/schemas/${selectedSchemaForIntegration}` }
                  ]
                }
              }
            };
          }
        } else {
          // No existing schema, add the new one
          endpoint.requestBody = {
            required: true,
            content: {
              'application/json': {
                schema: {
                  $ref: `#/components/schemas/${selectedSchemaForIntegration}`
                }
              }
            }
          };
        }
      } else {
        // Handle response - check if there's already a schema
        if (!endpoint.responses) endpoint.responses = {};
        
        if (endpoint.responses[statusCode] && 
            endpoint.responses[statusCode].content && 
            endpoint.responses[statusCode].content['application/json'] && 
            endpoint.responses[statusCode].content['application/json'].schema) {
          
          const existingSchema = endpoint.responses[statusCode].content['application/json'].schema;
          
          // If there's already a schema reference, create a composite schema
          if (existingSchema.$ref) {
            // Create a composite schema that includes both
            const compositeSchemaName = `${path.replace(/[^a-zA-Z0-9]/g, '')}_${method}_Response${statusCode}`;
            
            // Add composite schema to components
            if (!spec.components.schemas[compositeSchemaName]) {
              spec.components.schemas[compositeSchemaName] = {
                type: 'object',
                properties: {
                  success: {
                    type: 'boolean',
                    description: 'Indicates if the request was successful'
                  },
                  data: {
                    allOf: [
                      existingSchema,
                      { $ref: `#/components/schemas/${selectedSchemaForIntegration}` }
                    ]
                  }
                }
              };
            } else {
              // Add to existing composite schema
              if (!spec.components.schemas[compositeSchemaName].properties.data.allOf.find(
                schema => schema.$ref === `#/components/schemas/${selectedSchemaForIntegration}`
              )) {
                spec.components.schemas[compositeSchemaName].properties.data.allOf.push({
                  $ref: `#/components/schemas/${selectedSchemaForIntegration}`
                });
              }
            }
            
            // Update the response to use the composite schema
            endpoint.responses[statusCode].content['application/json'].schema = {
              $ref: `#/components/schemas/${compositeSchemaName}`
            };
          } else {
            // Create a wrapper schema
            endpoint.responses[statusCode].content['application/json'].schema = {
              type: 'object',
              properties: {
                success: {
                  type: 'boolean',
                  description: 'Indicates if the request was successful'
                },
                data: {
                  allOf: [
                    existingSchema,
                    { $ref: `#/components/schemas/${selectedSchemaForIntegration}` }
                  ]
                }
              }
            };
          }
        } else {
          // No existing schema, add the new one wrapped in a response structure
          endpoint.responses[statusCode] = {
            description: statusCode === '200' ? 'Successful response' : 'Response',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: {
                      type: 'boolean',
                      description: 'Indicates if the request was successful'
                    },
                    data: {
                      $ref: `#/components/schemas/${selectedSchemaForIntegration}`
                    }
                  }
                }
              }
            }
          };
        }
      }

      const updatedSpecData = JSON.stringify(spec, null, 2);
      setSpecData(updatedSpecData);
      
      // Auto-save the updated spec
      updateSpecMutation.mutate({
        spec,
        changelog: `Schema ${selectedSchemaForIntegration} integrado en ${method} ${path}`
      });

      setIntegrationDialogOpen(false);
      toast.success(`Schema integrado en ${method} ${path}`);
      
    } catch (error) {
      console.error('❌ [API EDITOR] Error integrating schema:', error);
      toast.error('Error integrando el schema');
    }
  };

  // Update basic API info
  const updateAPIMutation = useMutation({
    mutationFn: (data) => apiService.updateAPI(id, data),
    onSuccess: () => {
      toast.success('API actualizada exitosamente');
      setUnsavedChanges(false);
      queryClient.invalidateQueries(['api-detail', id]);
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Error actualizando la API');
    }
  });

  // Update API specification
  const updateSpecMutation = useMutation({
    mutationFn: (data) => apiService.updateAPISpec(id, data),
    onSuccess: () => {
      toast.success('Especificación actualizada exitosamente');
      setUnsavedChanges(false);
      queryClient.invalidateQueries(['api-detail', id]);
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Error actualizando la especificación');
    }
  });

  // Handle form changes
  const handleFormChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setUnsavedChanges(true);
  };

  // Handle spec changes
  const handleSpecChange = (value) => {
    setSpecData(value);
    setUnsavedChanges(true);
    
    // Validate JSON
    try {
      JSON.parse(value);
      setSpecError('');
    } catch (error) {
      setSpecError('JSON inválido: ' + error.message);
    }
  };

  // Save basic info
  const handleSaveBasicInfo = () => {
    console.log('🔧 [API EDITOR] Attempting to save basic info:', formData);
    console.log('🔧 [API EDITOR] Current API data:', api);
    console.log('🔧 [API EDITOR] Is editing name:', isEditingName);
    
    // Only validate name if we're editing it
    if (isEditingName && (!formData.name || formData.name.trim().length === 0)) {
      toast.error('El nombre de la API es requerido');
      return;
    }
    
    // Build update object with only the fields that should be updated
    const updatedFields = {};
    
    // Only include name if we're editing it
    if (isEditingName && formData.name) {
      updatedFields.name = formData.name;
    }
    
    // Always include other fields that might have changed
    if (formData.description !== undefined) {
      updatedFields.description = formData.description;
    }
    if (formData.status !== undefined) {
      updatedFields.status = formData.status;
    }
    if (formData.visibility !== undefined) {
      updatedFields.visibility = formData.visibility;
    }
    if (formData.category !== undefined) {
      updatedFields.category = formData.category;
    }
    if (formData.tags !== undefined) {
      updatedFields.tags = formData.tags;
    }
    
    console.log('🔧 [API EDITOR] Sending update fields:', updatedFields);
    
    updateAPIMutation.mutate(updatedFields, {
      onSuccess: () => {
        setIsEditingName(false); // Close name editing after successful save
      }
    });
  };

  // Save specification
  const handleSaveSpec = () => {
    console.log('🔧 [API EDITOR] Attempting to save specification');
    console.log('🔧 [API EDITOR] Current spec data length:', specData.length);
    
    try {
      const spec = JSON.parse(specData);
      console.log('🔧 [API EDITOR] Parsed spec keys:', Object.keys(spec));
      console.log('🔧 [API EDITOR] Has components:', !!spec.components);
      console.log('🔧 [API EDITOR] Has schemas:', !!(spec.components?.schemas));
      console.log('🔧 [API EDITOR] Schemas count:', spec.components?.schemas ? Object.keys(spec.components.schemas).length : 0);
      console.log('🔧 [API EDITOR] Schema names:', spec.components?.schemas ? Object.keys(spec.components.schemas) : []);
      
      updateSpecMutation.mutate({
        spec,
        changelog: 'Especificación actualizada desde el editor'
      });
    } catch (error) {
      console.error('❌ [API EDITOR] JSON parse error:', error);
      toast.error('JSON inválido. Por favor corrige los errores antes de guardar.');
    }
  };

  // Add tag
  const handleAddTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      handleFormChange('tags', [...formData.tags, newTag.trim()]);
      setNewTag('');
      setAddTagOpen(false);
    }
  };

  // Remove tag
  const handleRemoveTag = (tagToRemove) => {
    handleFormChange('tags', formData.tags.filter(tag => tag !== tagToRemove));
  };

  // Parse spec for Swagger UI
  const getParsedSpec = () => {
    try {
      return JSON.parse(specData);
    } catch (error) {
      return null;
    }
  };

  if (isLoading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4, textAlign: 'center' }}>
        <CircularProgress />
        <Typography variant="h6" sx={{ mt: 2 }}>
          Cargando editor...
        </Typography>
      </Container>
    );
  }

  if (error || !api) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error">
          Error cargando la API para editar
        </Alert>
        <Button 
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/apis')}
          sx={{ mt: 2 }}
        >
          Volver a APIs
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box mb={4}>
        <Button 
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate(`/apis/${id}`)}
          sx={{ mb: 2 }}
        >
          Volver a detalles
        </Button>
        
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="h4" gutterBottom>
              Editar API: {api.name}
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Personaliza la información y especificación de tu API
            </Typography>
          </Box>
          
          {unsavedChanges && (
            <Alert severity="warning" sx={{ ml: 2 }}>
              Tienes cambios sin guardar
            </Alert>
          )}
        </Box>
      </Box>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
          <Tab label="Información Básica" icon={<DescriptionIcon />} />
          <Tab label="Especificación OpenAPI" icon={<CodeIcon />} />
          <Tab label="Schemas de Datos" icon={<SettingsIcon />} />
          <Tab label="Vista Previa Swagger" icon={<PreviewIcon />} />
        </Tabs>
      </Box>

      {/* Tab Content */}
      {tabValue === 0 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Información Básica de la API
            </Typography>
            
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                {!isEditingName ? (
                  <Box display="flex" alignItems="center" gap={2}>
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Nombre de la API
                      </Typography>
                      <Typography variant="h6">
                        {api.name}
                      </Typography>
                    </Box>
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<EditIcon />}
                      onClick={() => setIsEditingName(true)}
                    >
                      Editar
                    </Button>
                  </Box>
                ) : (
                  <Box display="flex" alignItems="center" gap={1}>
                    <TextField
                      fullWidth
                      label="Nombre de la API"
                      value={formData.name}
                      onChange={(e) => handleFormChange('name', e.target.value)}
                      required
                    />
                    <Button
                      size="small"
                      onClick={() => setIsEditingName(false)}
                    >
                      Cancelar
                    </Button>
                  </Box>
                )}
              </Grid>
              
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Categoría</InputLabel>
                  <Select
                    value={formData.category}
                    onChange={(e) => handleFormChange('category', e.target.value)}
                    label="Categoría"
                  >
                    <MenuItem value="customer-management">Gestión de Clientes</MenuItem>
                    <MenuItem value="account-management">Gestión de Cuentas</MenuItem>
                    <MenuItem value="payment-processing">Procesamiento de Pagos</MenuItem>
                    <MenuItem value="lending">Préstamos</MenuItem>
                    <MenuItem value="risk-management">Gestión de Riesgos</MenuItem>
                    <MenuItem value="compliance">Cumplimiento</MenuItem>
                    <MenuItem value="analytics">Analíticas</MenuItem>
                    <MenuItem value="other">Otro</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Descripción"
                  multiline
                  rows={4}
                  value={formData.description}
                  onChange={(e) => handleFormChange('description', e.target.value)}
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Estado</InputLabel>
                  <Select
                    value={formData.status}
                    onChange={(e) => handleFormChange('status', e.target.value)}
                    label="Estado"
                  >
                    <MenuItem value="draft">Borrador</MenuItem>
                    <MenuItem value="review">En Revisión</MenuItem>
                    <MenuItem value="published">Publicado</MenuItem>
                    <MenuItem value="deprecated">Obsoleto</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Visibilidad</InputLabel>
                  <Select
                    value={formData.visibility}
                    onChange={(e) => handleFormChange('visibility', e.target.value)}
                    label="Visibilidad"
                  >
                    <MenuItem value="private">Privado</MenuItem>
                    <MenuItem value="company">Empresa</MenuItem>
                    <MenuItem value="public">Público</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12}>
                <Typography variant="subtitle1" gutterBottom>
                  Etiquetas
                </Typography>
                <Box display="flex" gap={1} flexWrap="wrap" mb={2}>
                  {formData.tags.map((tag, index) => (
                    <Chip
                      key={index}
                      label={tag}
                      onDelete={() => handleRemoveTag(tag)}
                      color="primary"
                      variant="outlined"
                    />
                  ))}
                  <Chip
                    label="+ Agregar etiqueta"
                    onClick={() => setAddTagOpen(true)}
                    color="primary"
                    variant="outlined"
                    icon={<AddIcon />}
                  />
                </Box>
              </Grid>
            </Grid>
            
            <Box mt={3} display="flex" gap={2}>
              <Button
                variant="contained"
                startIcon={<SaveIcon />}
                onClick={handleSaveBasicInfo}
                disabled={updateAPIMutation.isLoading}
              >
                {updateAPIMutation.isLoading ? 'Guardando...' : 'Guardar Información'}
              </Button>
            </Box>
          </CardContent>
        </Card>
      )}

      {tabValue === 1 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Especificación OpenAPI
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Edita la especificación OpenAPI de tu API. Asegúrate de que el JSON sea válido.
            </Typography>
            
            {specError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {specError}
              </Alert>
            )}
            
            <TextField
              fullWidth
              multiline
              rows={20}
              value={specData}
              onChange={(e) => handleSpecChange(e.target.value)}
              variant="outlined"
              sx={{
                '& .MuiInputBase-input': {
                  fontFamily: 'monospace',
                  fontSize: '0.875rem'
                }
              }}
            />
            
            <Box mt={3} display="flex" gap={2}>
              <Button
                variant="contained"
                startIcon={<SaveIcon />}
                onClick={handleSaveSpec}
                disabled={updateSpecMutation.isLoading || !!specError}
              >
                {updateSpecMutation.isLoading ? 'Guardando...' : 'Guardar Especificación'}
              </Button>
              <Button
                variant="outlined"
                onClick={() => setTabValue(2)}
                disabled={!!specError}
              >
                Vista Previa
              </Button>
            </Box>
          </CardContent>
        </Card>
      )}

      {tabValue === 2 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Schemas de Datos BIAN
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Gestiona los modelos de datos de tu API. Puedes editar los schemas por defecto de BIAN y agregar campos personalizados.
            </Typography>
            
            {/* Add new schema */}
            <Box mb={3}>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={8}>
                  <TextField
                    fullWidth
                    label="Nombre del nuevo schema"
                    value={newSchemaName}
                    onChange={(e) => setNewSchemaName(e.target.value)}
                    placeholder="Ej: CustomerProfile, TransactionData"
                  />
                </Grid>
                <Grid item xs={4}>
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={handleSchemaCreate}
                    disabled={!newSchemaName.trim()}
                    fullWidth
                  >
                    Crear Schema
                  </Button>
                </Grid>
              </Grid>
            </Box>
            
            {/* Schemas list */}
            {Object.keys(schemas).length > 0 ? (
              <>
                <Grid container spacing={2}>
                  {Object.entries(schemas).map(([schemaName, schema]) => (
                    <Grid item xs={12} md={6} key={schemaName}>
                      <Card variant="outlined">
                        <CardContent>
                          <Box mb={2}>
                            {/* Schema name with word wrapping */}
                            <Typography 
                              variant="h6" 
                              color="primary"
                              sx={{ 
                                wordBreak: 'break-word',
                                lineHeight: 1.2,
                                mb: 1,
                                maxWidth: '100%'
                              }}
                            >
                              {schemaName}
                            </Typography>
                            
                            {/* Action buttons in a separate row */}
                            <Box display="flex" gap={1} flexWrap="wrap">
                              <Button
                                size="small"
                                variant="outlined"
                                onClick={() => handleSchemaEdit(schemaName)}
                              >
                                Editar
                              </Button>
                              <Button
                                size="small"
                                variant="contained"
                                color="success"
                                onClick={() => handleSchemaIntegration(schemaName)}
                                disabled={availablePaths.length === 0}
                              >
                                Integrar en API
                              </Button>
                              <Button
                                size="small"
                                color="error"
                                onClick={() => handleSchemaDelete(schemaName)}
                              >
                                Eliminar
                              </Button>
                            </Box>
                          </Box>
                          
                          <Typography variant="body2" color="text.secondary" gutterBottom>
                            Tipo: {schema.type || 'object'}
                          </Typography>
                          
                          {schema.description && (
                            <Typography variant="body2" sx={{ mb: 2 }}>
                              {schema.description}
                            </Typography>
                          )}
                          
                          {schema.properties && (
                            <Box>
                              <Typography variant="subtitle2" gutterBottom>
                                Propiedades ({Object.keys(schema.properties).length}):
                              </Typography>
                              <Box display="flex" gap={1} flexWrap="wrap">
                                {Object.keys(schema.properties).slice(0, 5).map((prop) => (
                                  <Chip
                                    key={prop}
                                    label={prop}
                                    size="small"
                                    variant="outlined"
                                  />
                                ))}
                                {Object.keys(schema.properties).length > 5 && (
                                  <Chip
                                    label={`+${Object.keys(schema.properties).length - 5} más`}
                                    size="small"
                                    color="primary"
                                  />
                                )}
                              </Box>
                            </Box>
                          )}
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
                
                {/* Schema Usage Guide */}
                <Box mt={4}>
                  <Typography variant="h6" gutterBottom>
                    Cómo usar estos Schemas en tu API
                  </Typography>
                  <Alert severity="info" sx={{ mb: 2 }}>
                    Los schemas se pueden referenciar en los endpoints de tu API para definir 
                    la estructura de datos de requests y responses.
                  </Alert>
                  
                  <Grid container spacing={2}>
                    {Object.keys(schemas).map((schemaName) => (
                      <Grid item xs={12} md={6} key={`usage-${schemaName}`}>
                        <Card variant="outlined" sx={{ bgcolor: 'grey.50' }}>
                          <CardContent>
                            <Typography variant="subtitle1" gutterBottom color="primary">
                              Referencia para "{schemaName}"
                            </Typography>
                            <Typography variant="body2" sx={{ fontFamily: 'monospace', mb: 1 }}>
                              Request Body:
                            </Typography>
                            <Paper sx={{ p: 1, mb: 1, bgcolor: 'grey.100' }}>
                              <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                                {`"requestBody": {
  "content": {
    "application/json": {
      "schema": {
        "$ref": "#/components/schemas/${schemaName}"
      }
    }
  }
}`}
                              </Typography>
                            </Paper>
                            <Typography variant="body2" sx={{ fontFamily: 'monospace', mb: 1 }}>
                              Response:
                            </Typography>
                            <Paper sx={{ p: 1, bgcolor: 'grey.100' }}>
                              <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                                {`"responses": {
  "200": {
    "content": {
      "application/json": {
        "schema": {
          "$ref": "#/components/schemas/${schemaName}"
        }
      }
    }
  }
}`}
                              </Typography>
                            </Paper>
                          </CardContent>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                </Box>
              </>
            ) : (
              <Alert severity="info">
                No se encontraron schemas en la especificación OpenAPI. 
                Los schemas definen la estructura de los datos que tu API maneja.
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {tabValue === 3 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Vista Previa Swagger UI
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Visualiza y prueba tu API con Swagger UI
            </Typography>
            
            {getParsedSpec() ? (
              <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                <SwaggerUI spec={getParsedSpec()} />
              </Paper>
            ) : (
              <Alert severity="warning">
                No se puede mostrar la vista previa. Verifica que la especificación OpenAPI sea válida.
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Add Tag Dialog */}
      <Dialog open={addTagOpen} onClose={() => setAddTagOpen(false)}>
        <DialogTitle>Agregar Etiqueta</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            label="Nueva etiqueta"
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleAddTag();
              }
            }}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddTagOpen(false)}>Cancelar</Button>
          <Button onClick={handleAddTag} variant="contained">
            Agregar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Schema Edit Dialog */}
      <Dialog 
        open={schemaDialogOpen} 
        onClose={() => setSchemaDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Editar Schema: {selectedSchema}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Edita la estructura JSON del schema. Puedes agregar nuevas propiedades, 
            cambiar tipos de datos y definir validaciones.
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={15}
            value={editingSchema || ''}
            onChange={(e) => setEditingSchema(e.target.value)}
            variant="outlined"
            sx={{
              '& .MuiInputBase-input': {
                fontFamily: 'monospace',
                fontSize: '0.875rem'
              }
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSchemaDialogOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSchemaSave} variant="contained">
            Guardar Schema
          </Button>
        </DialogActions>
      </Dialog>

      {/* Schema Integration Dialog */}
      <Dialog 
        open={integrationDialogOpen} 
        onClose={() => setIntegrationDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Integrar Schema: {selectedSchemaForIntegration}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Selecciona el endpoint donde quieres usar este schema y especifica 
            si será para request body o response.
          </Typography>
          
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Endpoint</InputLabel>
                <Select
                  value={`${integrationSettings.path}|${integrationSettings.method}`}
                  onChange={(e) => {
                    const [path, method] = e.target.value.split('|');
                    setIntegrationSettings(prev => ({ ...prev, path, method }));
                  }}
                  label="Endpoint"
                >
                  {availablePaths.map((pathInfo, index) => (
                    <MenuItem 
                      key={index} 
                      value={`${pathInfo.path}|${pathInfo.method}`}
                    >
                      <Box>
                        <Typography variant="body2" component="span">
                          <strong>{pathInfo.method}</strong> {pathInfo.path}
                        </Typography>
                        <Typography variant="caption" display="block" color="text.secondary">
                          {pathInfo.summary}
                        </Typography>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Uso del Schema</InputLabel>
                <Select
                  value={integrationSettings.usage}
                  onChange={(e) => setIntegrationSettings(prev => ({ 
                    ...prev, 
                    usage: e.target.value 
                  }))}
                  label="Uso del Schema"
                >
                  <MenuItem value="request">Request Body (datos de entrada)</MenuItem>
                  <MenuItem value="response">Response (datos de salida)</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            {integrationSettings.usage === 'response' && (
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Código de Respuesta</InputLabel>
                  <Select
                    value={integrationSettings.statusCode}
                    onChange={(e) => setIntegrationSettings(prev => ({ 
                      ...prev, 
                      statusCode: e.target.value 
                    }))}
                    label="Código de Respuesta"
                  >
                    <MenuItem value="200">200 - OK</MenuItem>
                    <MenuItem value="201">201 - Created</MenuItem>
                    <MenuItem value="400">400 - Bad Request</MenuItem>
                    <MenuItem value="404">404 - Not Found</MenuItem>
                    <MenuItem value="500">500 - Server Error</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            )}
            
            <Grid item xs={12}>
              <Alert severity="info">
                {(() => {
                  const existingSchemaInfo = getEndpointSchemaInfo();
                  const baseMessage = integrationSettings.usage === 'request' 
                    ? `El schema ${selectedSchemaForIntegration} se usará para validar los datos que envían los clientes en las peticiones.`
                    : `El schema ${selectedSchemaForIntegration} definirá la estructura de los datos que devuelve tu API.`;
                  
                  if (existingSchemaInfo) {
                    return `${baseMessage}\n\n⚠️ NOTA: Este endpoint ya tiene un schema. Se combinarán ambos schemas en una estructura wrapper con una propiedad "data".`;
                  }
                  
                  return baseMessage;
                })()}
              </Alert>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIntegrationDialogOpen(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleIntegrateSchema} 
            variant="contained"
            disabled={!integrationSettings.path || !integrationSettings.method}
          >
            Integrar Schema
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default APIEditor; 