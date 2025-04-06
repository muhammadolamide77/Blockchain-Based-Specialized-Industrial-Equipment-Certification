import { describe, it, expect, beforeEach } from "vitest"

// Mock implementation for testing Clarity contracts
const mockBlockchain = {
  currentSender: "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM", // Maintenance technician
  blockHeight: 100,
  contracts: {
    "maintenance-history": {
      admin: "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM",
      maintenanceRecords: new Map(),
      recordCounter: 0,
    },
  },
  setSender(address) {
    this.currentSender = address
  },
  setBlockHeight(height) {
    this.blockHeight = height
  },
  callContract(contract, method, args) {
    const contractState = this.contracts[contract]
    
    if (method === "add-maintenance-record") {
      const [equipmentId, maintenanceType, description, nextMaintenanceDue] = args
      
      const newId = contractState.recordCounter + 1
      contractState.recordCounter = newId
      
      const key = `${equipmentId}-${newId}`
      contractState.maintenanceRecords.set(key, {
        performedBy: this.currentSender,
        maintenanceDate: this.blockHeight,
        maintenanceType,
        description,
        nextMaintenanceDue,
      })
      
      return { success: true }
    }
    
    if (method === "get-maintenance-record") {
      const [equipmentId, recordId] = args
      const key = `${equipmentId}-${recordId}`
      
      return contractState.maintenanceRecords.get(key) || null
    }
    
    if (method === "is-maintenance-due") {
      const [equipmentId, recordId] = args
      const key = `${equipmentId}-${recordId}`
      
      const record = contractState.maintenanceRecords.get(key)
      if (!record) {
        return false
      }
      
      return this.blockHeight >= record.nextMaintenanceDue
    }
    
    if (method === "get-record-counter") {
      return contractState.recordCounter
    }
    
    return { error: "Method not found" }
  },
}

describe("Maintenance History Contract", () => {
  beforeEach(() => {
    // Reset contract state
    mockBlockchain.contracts["maintenance-history"].maintenanceRecords.clear()
    mockBlockchain.contracts["maintenance-history"].recordCounter = 0
    mockBlockchain.setBlockHeight(100)
    mockBlockchain.setSender("ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM")
  })
  
  it("should allow adding maintenance records", () => {
    const result = mockBlockchain.callContract("maintenance-history", "add-maintenance-record", [
      "EQUIP001",
      "ROUTINE",
      "Oil change and filter replacement",
      200,
    ])
    
    expect(result).toEqual({ success: true })
    expect(mockBlockchain.contracts["maintenance-history"].recordCounter).toBe(1)
    
    const record = mockBlockchain.callContract("maintenance-history", "get-maintenance-record", ["EQUIP001", 1])
    
    expect(record).toMatchObject({
      performedBy: "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM",
      maintenanceType: "ROUTINE",
      description: "Oil change and filter replacement",
      nextMaintenanceDue: 200,
    })
  })
  
  it("should increment record counter for each new record", () => {
    // Add first record
    mockBlockchain.callContract("maintenance-history", "add-maintenance-record", [
      "EQUIP001",
      "ROUTINE",
      "Oil change",
      200,
    ])
    
    // Add second record
    mockBlockchain.callContract("maintenance-history", "add-maintenance-record", [
      "EQUIP001",
      "REPAIR",
      "Belt replacement",
      300,
    ])
    
    expect(mockBlockchain.contracts["maintenance-history"].recordCounter).toBe(2)
    
    // Add record for different equipment
    mockBlockchain.callContract("maintenance-history", "add-maintenance-record", [
      "EQUIP002",
      "INSPECTION",
      "Annual safety check",
      400,
    ])
    
    expect(mockBlockchain.contracts["maintenance-history"].recordCounter).toBe(3)
  })
  
  it("should correctly identify when maintenance is due", () => {
    // Add maintenance record
    mockBlockchain.callContract("maintenance-history", "add-maintenance-record", [
      "EQUIP001",
      "ROUTINE",
      "Oil change",
      150,
    ])
    
    // Before due date
    expect(mockBlockchain.callContract("maintenance-history", "is-maintenance-due", ["EQUIP001", 1])).toBe(false)
    
    // At due date
    mockBlockchain.setBlockHeight(150)
    expect(mockBlockchain.callContract("maintenance-history", "is-maintenance-due", ["EQUIP001", 1])).toBe(true)
    
    // After due date
    mockBlockchain.setBlockHeight(200)
    expect(mockBlockchain.callContract("maintenance-history", "is-maintenance-due", ["EQUIP001", 1])).toBe(true)
  })
  
  it("should return null for non-existent records", () => {
    expect(mockBlockchain.callContract("maintenance-history", "get-maintenance-record", ["EQUIP001", 999])).toBe(null)
  })
})

