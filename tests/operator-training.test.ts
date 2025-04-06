import { describe, it, expect, beforeEach } from "vitest"

// Mock implementation for testing Clarity contracts
const mockBlockchain = {
  currentSender: "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM", // Admin/Trainer
  blockHeight: 100,
  contracts: {
    "operator-training": {
      admin: "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM",
      operatorQualifications: new Map(),
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
    
    if (method === "certify-operator") {
      const [operator, equipmentType, trainingLevel, expirationDate] = args
      
      if (expirationDate <= this.blockHeight) {
        return { error: 101 }
      }
      
      const key = `${operator}-${equipmentType}`
      contractState.operatorQualifications.set(key, {
        certifiedBy: this.currentSender,
        certificationDate: this.blockHeight,
        expirationDate,
        trainingLevel,
        isValid: true,
      })
      
      return { success: true }
    }
    
    if (method === "revoke-qualification") {
      const [operator, equipmentType] = args
      const key = `${operator}-${equipmentType}`
      
      const qualification = contractState.operatorQualifications.get(key)
      if (!qualification) {
        return { error: 102 }
      }
      
      if (this.currentSender !== contractState.admin && this.currentSender !== qualification.certifiedBy) {
        return { error: 100 }
      }
      
      qualification.isValid = false
      contractState.operatorQualifications.set(key, qualification)
      
      return { success: true }
    }
    
    if (method === "is-qualified") {
      const [operator, equipmentType] = args
      const key = `${operator}-${equipmentType}`
      
      const qualification = contractState.operatorQualifications.get(key)
      if (!qualification) {
        return false
      }
      
      return qualification.isValid && this.blockHeight < qualification.expirationDate
    }
    
    if (method === "get-qualification") {
      const [operator, equipmentType] = args
      const key = `${operator}-${equipmentType}`
      
      return contractState.operatorQualifications.get(key) || null
    }
    
    return { error: "Method not found" }
  },
}

describe("Operator Training Contract", () => {
  beforeEach(() => {
    // Reset contract state
    mockBlockchain.contracts["operator-training"].operatorQualifications.clear()
    mockBlockchain.setBlockHeight(100)
    mockBlockchain.setSender("ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM")
  })
  
  it("should allow certifying an operator", () => {
    const result = mockBlockchain.callContract("operator-training", "certify-operator", [
      "ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG",
      "CRANE-OPERATOR",
      2,
      200,
    ])
    
    expect(result).toEqual({ success: true })
    expect(
        mockBlockchain.callContract("operator-training", "is-qualified", [
          "ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG",
          "CRANE-OPERATOR",
        ]),
    ).toBe(true)
  })
  
  it("should not allow certification with past expiration date", () => {
    const result = mockBlockchain.callContract("operator-training", "certify-operator", [
      "ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG",
      "CRANE-OPERATOR",
      2,
      50,
    ])
    
    expect(result).toEqual({ error: 101 })
  })
  
  it("should allow revoking qualification by certifier", () => {
    // First certify operator
    mockBlockchain.setSender("ST3AMFB2C3V8VV2B69FMYX20BN6WKN6HPZEA865CP")
    mockBlockchain.callContract("operator-training", "certify-operator", [
      "ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG",
      "CRANE-OPERATOR",
      2,
      200,
    ])
    
    // Then revoke it
    const result = mockBlockchain.callContract("operator-training", "revoke-qualification", [
      "ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG",
      "CRANE-OPERATOR",
    ])
    
    expect(result).toEqual({ success: true })
    expect(
        mockBlockchain.callContract("operator-training", "is-qualified", [
          "ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG",
          "CRANE-OPERATOR",
        ]),
    ).toBe(false)
  })
  
  it("should allow admin to revoke any qualification", () => {
    // First certify operator by someone else
    mockBlockchain.setSender("ST3AMFB2C3V8VV2B69FMYX20BN6WKN6HPZEA865CP")
    mockBlockchain.callContract("operator-training", "certify-operator", [
      "ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG",
      "CRANE-OPERATOR",
      2,
      200,
    ])
    
    // Admin revokes it
    mockBlockchain.setSender("ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM")
    const result = mockBlockchain.callContract("operator-training", "revoke-qualification", [
      "ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG",
      "CRANE-OPERATOR",
    ])
    
    expect(result).toEqual({ success: true })
    expect(
        mockBlockchain.callContract("operator-training", "is-qualified", [
          "ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG",
          "CRANE-OPERATOR",
        ]),
    ).toBe(false)
  })
  
  it("should consider expired qualifications as not qualified", () => {
    // Certify operator
    mockBlockchain.callContract("operator-training", "certify-operator", [
      "ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG",
      "CRANE-OPERATOR",
      2,
      150,
    ])
    
    // Move block height past expiration
    mockBlockchain.setBlockHeight(160)
    
    expect(
        mockBlockchain.callContract("operator-training", "is-qualified", [
          "ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG",
          "CRANE-OPERATOR",
        ]),
    ).toBe(false)
  })
})

